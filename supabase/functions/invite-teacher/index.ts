import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is an owner
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const { data: callerProfile } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();
    if (callerProfile?.role !== "organization_owner") throw new Error("Only owners can add teachers");

    // Get owner's org
    const { data: org } = await userClient
      .from("organizations")
      .select("id")
      .eq("owner_id", caller.id)
      .single();
    if (!org) throw new Error("Organization not found");

    const { email, full_name, contact_number, subject, password } = await req.json();
    if (!email || !full_name || !password) throw new Error("Missing required fields");

    // Use admin client to create the teacher user
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Create user with teacher role
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "teacher", full_name },
    });

    if (createError) throw createError;

    // Link teacher to organization
    const { error: linkError } = await adminClient
      .from("organization_teachers")
      .insert({
        organization_id: org.id,
        teacher_id: newUser.user.id,
        contact_number: contact_number || null,
        subject: subject || null,
      });

    if (linkError) throw linkError;

    return new Response(JSON.stringify({ success: true, teacher_id: newUser.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
