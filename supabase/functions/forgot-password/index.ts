import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const { action } = body

    if (action === 'send-pin') {
      const { email } = body
      if (!email || typeof email !== 'string') {
        return jsonResponse({ error: 'Email is required' })
      }

      // Find user by email
      const { data: { users } } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const user = users?.find((u: any) => u.email === email)
      if (!user) {
        return jsonResponse({ error: 'No account found with this email' })
      }

      const backupEmail = user.user_metadata?.backup_email
      if (!backupEmail) {
        return jsonResponse({ error: 'no_backup_email' })
      }

      // Generate 6-digit PIN
      const pin = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      // Invalidate old unused PINs for this user
      await supabase
        .from('password_reset_pins')
        .update({ used: true })
        .eq('user_id', user.id)
        .eq('used', false)

      // Store new PIN
      await supabase.from('password_reset_pins').insert({
        user_id: user.id,
        pin,
        backup_email: backupEmail,
        expires_at: expiresAt.toISOString(),
      })

      // Send email via Resend
      const resendKey = Deno.env.get('RESEND_API_KEY')
      if (!resendKey) {
        return jsonResponse({ error: 'Email service not configured. Please add RESEND_API_KEY.' })
      }

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'QuizFlow <onboarding@resend.dev>',
          to: backupEmail,
          subject: 'Your Password Reset PIN',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px">
              <h2 style="color:#333">Password Reset</h2>
              <p style="color:#555">Your 6-digit PIN is:</p>
              <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f3f4f6;border-radius:8px;margin:20px 0;color:#111">${pin}</div>
              <p style="color:#888;font-size:14px">This PIN expires in 10 minutes. If you didn't request this, please ignore this email.</p>
            </div>
          `,
        }),
      })

      if (!emailRes.ok) {
        const errText = await emailRes.text()
        console.error('Resend error:', errText)
        return jsonResponse({ error: 'Failed to send email' })
      }

      // Mask backup email for display
      const [localPart, domain] = backupEmail.split('@')
      let maskedLocal: string
      if (localPart.length <= 4) {
        maskedLocal = localPart[0] + '*'.repeat(localPart.length - 1)
      } else {
        maskedLocal = localPart.slice(0, 2) + '*'.repeat(Math.min(localPart.length - 4, 5)) + localPart.slice(-2)
      }
      const masked = maskedLocal + '@' + domain

      return jsonResponse({ success: true, maskedEmail: masked })

    } else if (action === 'verify-pin') {
      const { email, pin } = body
      if (!email || !pin) {
        return jsonResponse({ error: 'Email and PIN are required' })
      }

      const { data: { users } } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const user = users?.find((u: any) => u.email === email)
      if (!user) {
        return jsonResponse({ error: 'User not found' })
      }

      const { data: pins } = await supabase
        .from('password_reset_pins')
        .select('id')
        .eq('user_id', user.id)
        .eq('pin', pin)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)

      if (!pins?.length) {
        return jsonResponse({ error: 'Invalid or expired PIN' })
      }

      return jsonResponse({ success: true, resetToken: pins[0].id })

    } else if (action === 'reset-password') {
      const { resetToken, newPassword } = body
      if (!resetToken || !newPassword) {
        return jsonResponse({ error: 'Reset token and new password are required' })
      }
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return jsonResponse({ error: 'Password must be at least 6 characters' })
      }

      const { data: pinRecord } = await supabase
        .from('password_reset_pins')
        .select('user_id')
        .eq('id', resetToken)
        .eq('used', false)
        .single()

      if (!pinRecord) {
        return jsonResponse({ error: 'Invalid or expired reset token' })
      }

      const { error } = await supabase.auth.admin.updateUserById(
        pinRecord.user_id,
        { password: newPassword }
      )
      if (error) {
        return jsonResponse({ error: error.message })
      }

      // Mark PIN as used
      await supabase
        .from('password_reset_pins')
        .update({ used: true })
        .eq('id', resetToken)

      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Invalid action' })
  } catch (err) {
    console.error('forgot-password error:', err)
    return jsonResponse({ error: 'Internal server error' })
  }
})
