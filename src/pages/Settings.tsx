import { useState } from "react"; // refresh
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleSidebar } from "@/components/RoleSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User, Shield, Mail, Save, Loader2, Eye, EyeOff, BadgeCheck } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";


const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user!.id)
        .single();
      return data?.role ?? null;
    },
    enabled: !!user?.id,
  });

  const roleLabel = userRole === "organization_owner" ? "Organization Owner" : userRole === "teacher" ? "Teacher" : "—";

  // Profile
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Backup email
  const [backupEmail, setBackupEmail] = useState("");
  const [savingBackup, setSavingBackup] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : "U";

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const updates: { data?: { full_name: string }; email?: string } = {};

      if (displayName !== user?.user_metadata?.full_name) {
        updates.data = { full_name: displayName.trim() };
      }
      if (email !== user?.email) {
        updates.email = email.trim();
      }

      if (!updates.data && !updates.email) {
        toast({ title: "No changes", description: "Nothing to update." });
        setSavingProfile(false);
        return;
      }

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;

      // Also update the profiles table
      if (updates.data) {
        await supabase
          .from("profiles")
          .update({ full_name: displayName.trim() })
          .eq("id", user!.id);
      }

      toast({
        title: "Profile updated",
        description: updates.email
          ? "A confirmation email has been sent to your new email address."
          : "Your display name has been updated.",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Mismatch", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setSavingSecurity(true);
    try {
      // Verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      });
      if (signInError) {
        toast({ title: "Invalid password", description: "Current password is incorrect.", variant: "destructive" });
        setSavingSecurity(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: "Password changed", description: "Your password has been updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleSaveBackupEmail = async () => {
    if (!backupEmail.trim()) {
      toast({ title: "Required", description: "Please enter a backup email.", variant: "destructive" });
      return;
    }

    setSavingBackup(true);
    try {
      // Refresh session to avoid stale JWT errors
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;

      const { error } = await supabase.auth.updateUser({
        data: { backup_email: backupEmail.trim() },
      });
      if (error) throw error;

      toast({ title: "Backup email saved", description: "Your backup email has been updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingBackup(false);
    }
  };

  const sectionClass =
    "rounded-lg border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] overflow-hidden";
  const sectionHeaderClass =
    "flex items-center gap-2.5 px-5 py-4 border-b border-[hsl(var(--dashboard-border))]";
  const labelClass = "font-mono text-[10px] tracking-[0.15em] uppercase text-[hsl(var(--dashboard-text)/.75)]";
  const inputClass =
    "bg-[hsl(var(--dashboard-card))] border-[hsl(var(--dashboard-border))] text-[hsl(var(--dashboard-text)/.9)] placeholder:text-[hsl(var(--dashboard-text)/.7)] focus-visible:ring-[hsl(var(--dashboard-gold)/0.4)]";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[hsl(var(--dashboard-bg))]">
        <RoleSidebar />
        <div className="flex-1 flex flex-col">
          {/* Topbar */}
          <header className="h-14 flex items-center justify-between border-b border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] px-5">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-[hsl(var(--dashboard-text)/.7)] hover:text-[hsl(var(--dashboard-text)/.95)]" />
              <span className="inline-flex items-center rounded-full border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] px-3 py-1 font-mono text-[10px] tracking-[0.15em] uppercase text-[hsl(var(--dashboard-text)/.8)]">
                Org / Settings
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--dashboard-gold))] font-mono text-[12px] font-bold text-[hsl(var(--dashboard-bg))]">
                {initials}
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-[hsl(var(--dashboard-text)/.6)] transition-colors hover:text-[hsl(var(--dashboard-text)/.9)]"
              >
                <LogOut className="h-3 w-3" />
                Sign out
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-[hsl(var(--dashboard-text)/.95)] mb-8">
              Settings
            </h1>

            <div className="max-w-2xl space-y-6">
              {/* Profile Section */}
              <div className={sectionClass}>
                <div className="h-[2px] bg-[hsl(var(--dashboard-gold))]" />
                <div className={sectionHeaderClass}>
                  <User className="h-4 w-4 text-[hsl(var(--dashboard-gold))]" />
                  <span className="font-mono text-[11px] tracking-wider uppercase text-[hsl(var(--dashboard-gold))] font-semibold">
                    Profile
                  </span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-2">
                    <label className={labelClass}>Display Name</label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your full name"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>Email Address</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className={inputClass}
                    />
                    <p className="font-mono text-[9px] text-[hsl(var(--dashboard-text)/.8)]">
                      Changing email requires confirmation via the new address
                    </p>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-[hsl(var(--dashboard-border))]">
                    <label className={labelClass}>User Role</label>
                    <Input
                      value={roleLabel}
                      readOnly
                      disabled
                      className={`${inputClass} opacity-70 cursor-not-allowed`}
                    />
                    <p className="font-mono text-[9px] text-[hsl(var(--dashboard-text)/.8)]">
                      Your role is assigned by the system and cannot be changed here
                    </p>
                  </div>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="flex items-center gap-2 bg-[hsl(var(--dashboard-gold))] text-[hsl(var(--dashboard-bg))] font-mono text-[11px] tracking-wider uppercase font-bold hover:bg-[hsl(var(--dashboard-gold)/0.85)]"
                  >
                    {savingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {savingProfile ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </div>

              {/* Security Section */}
              <div className={sectionClass}>
                <div className="h-[2px] bg-[hsl(var(--dashboard-gold))]" />
                <div className={sectionHeaderClass}>
                  <Shield className="h-4 w-4 text-[hsl(var(--dashboard-gold))]" />
                  <span className="font-mono text-[11px] tracking-wider uppercase text-[hsl(var(--dashboard-gold))] font-semibold">
                    Security
                  </span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-2">
                    <label className={labelClass}>Current Password</label>
                    <div className="relative">
                      <Input
                        type={showCurrent ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
                        tabIndex={-1}
                      >
                        {showCurrent ? <EyeOff size={18} color="#e09615" /> : <Eye size={18} color="#e09615" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>New Password</label>
                    <div className="relative">
                      <Input
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
                        tabIndex={-1}
                      >
                        {showNew ? <EyeOff size={18} color="#e09615" /> : <Eye size={18} color="#e09615" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>Confirm New Password</label>
                    <div className="relative">
                      <Input
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff size={18} color="#e09615" /> : <Eye size={18} color="#e09615" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    onClick={handleChangePassword}
                    disabled={savingSecurity || !currentPassword || !newPassword || !confirmPassword}
                    className="flex items-center gap-2 bg-[hsl(var(--dashboard-gold))] text-[hsl(var(--dashboard-bg))] font-mono text-[11px] tracking-wider uppercase font-bold hover:bg-[hsl(var(--dashboard-gold)/0.85)] disabled:opacity-50"
                  >
                    {savingSecurity ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                    {savingSecurity ? "Updating..." : "Change Password"}
                  </Button>
                </div>
              </div>


              {/* Backup Email Section */}
              <div className={sectionClass}>
                <div className="h-[2px] bg-[hsl(var(--dashboard-gold))]" />
                <div className={sectionHeaderClass}>
                  <Mail className="h-4 w-4 text-[hsl(var(--dashboard-gold))]" />
                  <span className="font-mono text-[11px] tracking-wider uppercase text-[hsl(var(--dashboard-gold))] font-semibold">
                    Backup Email
                  </span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-2">
                    <label className={labelClass}>Recovery Email Address</label>
                    <Input
                      type="email"
                      value={backupEmail}
                      onChange={(e) => setBackupEmail(e.target.value)}
                      placeholder={user?.user_metadata?.backup_email || "backup@email.com"}
                      className={inputClass}
                    />
                    <p className="font-mono text-[9px] text-[hsl(var(--dashboard-text)/.8)]">
                      Used for account recovery if you lose access to your primary email
                    </p>
                  </div>
                  <Button
                    onClick={handleSaveBackupEmail}
                    disabled={savingBackup}
                    className="flex items-center gap-2 bg-[hsl(var(--dashboard-gold))] text-[hsl(var(--dashboard-bg))] font-mono text-[11px] tracking-wider uppercase font-bold hover:bg-[hsl(var(--dashboard-gold)/0.85)]"
                  >
                    {savingBackup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {savingBackup ? "Saving..." : "Save Backup Email"}
                  </Button>
              </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
