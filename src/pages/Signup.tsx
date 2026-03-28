import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building2, GraduationCap, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [backupEmail, setBackupEmail] = useState("");
  const [role, setRole] = useState<"organization_owner" | "teacher">("teacher");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const { signUp } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchOrgs = async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");
      if (data) setOrganizations(data);
    };
    fetchOrgs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signUp(email, password, role, fullName, backupEmail, role === "teacher" ? selectedOrgId : undefined, gender);
      toast({ title: "Account created!", description: "Check your email to verify your account." });
    } catch (error: any) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = isDark ? "" : "bg-white border-[#d0d4de] text-[#0f1117] placeholder:text-[#6b7494]/60 focus-visible:ring-[#e09615]/40";
  const labelClass = isDark ? "" : "text-[#0f1117] font-medium";
  const mutedClass = isDark ? "text-muted-foreground" : "text-[#6b7494]";

  const formContent = (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
      <div>
        <h1 className={`text-2xl font-serif font-bold ${isDark ? "text-foreground" : "text-[#0f1117]"}`}>Create your account</h1>
        <p className={`text-sm mt-1 ${mutedClass}`}>Choose your role and get started</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName" className={labelClass}>Full Name</Label>
          <Input id="fullName" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputClass} />
        </div>
        <div className="space-y-2">
          <Label className={labelClass}>Gender</Label>
          <RadioGroup value={gender} onValueChange={(v) => setGender(v as "male" | "female")} className="flex gap-4">
            <Label htmlFor="gender-male" className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 cursor-pointer transition-all ${gender === "male" ? "border-[#e09615] bg-[#e09615]/10" : isDark ? "border-border hover:border-accent/50" : "border-[#d0d4de] hover:border-[#e09615]/50"}`}>
              <RadioGroupItem value="male" id="gender-male" className="sr-only" />
              <span className={`text-sm font-medium ${isDark ? "" : "text-[#0f1117]"}`}>Male</span>
            </Label>
            <Label htmlFor="gender-female" className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 cursor-pointer transition-all ${gender === "female" ? "border-[#e09615] bg-[#e09615]/10" : isDark ? "border-border hover:border-accent/50" : "border-[#d0d4de] hover:border-[#e09615]/50"}`}>
              <RadioGroupItem value="female" id="gender-female" className="sr-only" />
              <span className={`text-sm font-medium ${isDark ? "" : "text-[#0f1117]"}`}>Female</span>
            </Label>
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className={labelClass}>Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className={labelClass}>Password</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className={`pr-10 ${inputClass}`} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none" tabIndex={-1}>
              {showPassword ? <EyeOff size={18} color="#e09615" /> : <Eye size={18} color="#e09615" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="backupEmail" className={labelClass}>Recovery Email <span className={`text-xs ${mutedClass}`}>(optional)</span></Label>
          <Input id="backupEmail" type="email" placeholder="backup@email.com" value={backupEmail} onChange={(e) => setBackupEmail(e.target.value)} className={inputClass} />
          <p className={`text-xs ${mutedClass}`}>Used for password recovery if you lose access to your primary email</p>
        </div>
        <div className="space-y-3">
          <Label className={labelClass}>I am a...</Label>
          <RadioGroup value={role} onValueChange={(v) => setRole(v as "organization_owner" | "teacher")} className="grid grid-cols-2 gap-3">
            <Label
              htmlFor="org-owner"
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                role === "organization_owner" ? "border-[#e09615] bg-[#e09615]/10" : isDark ? "border-border hover:border-accent/50" : "border-[#d0d4de] hover:border-[#e09615]/50"
              }`}
            >
              <RadioGroupItem value="organization_owner" id="org-owner" className="sr-only" />
              <Building2 className="h-8 w-8" style={{ color: "#e09615" }} />
              <span className={`text-sm font-medium text-center ${isDark ? "" : "text-[#0f1117]"}`}>Organization Owner</span>
            </Label>
            <Label
              htmlFor="teacher"
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                role === "teacher" ? "border-[#e09615] bg-[#e09615]/10" : isDark ? "border-border hover:border-accent/50" : "border-[#d0d4de] hover:border-[#e09615]/50"
              }`}
            >
              <RadioGroupItem value="teacher" id="teacher" className="sr-only" />
              <GraduationCap className="h-8 w-8" style={{ color: "#e09615" }} />
              <span className={`text-sm font-medium ${isDark ? "" : "text-[#0f1117]"}`}>Teacher</span>
            </Label>
          </RadioGroup>
        </div>
        {role === "teacher" && organizations.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="organization" className={labelClass}>Join an Organization <span className={`text-xs ${mutedClass}`}>(optional)</span></Label>
            <select
              id="organization"
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${isDark ? "border-input bg-background ring-offset-background focus-visible:ring-ring" : "border-[#d0d4de] bg-white text-[#0f1117] focus-visible:ring-[#e09615]/40"}`}
            >
              <option value="">No organization (independent)</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
            <p className={`text-xs ${mutedClass}`}>Select an organization to join, or sign up independently</p>
          </div>
        )}
      </div>
      <Button
        type="submit"
        className="w-full border-0 font-semibold"
        disabled={isLoading}
        style={{ backgroundColor: "#e09615", color: "#fff" }}
      >
        {isLoading ? "Creating account..." : "Create account"}
      </Button>
      <p className={`text-sm text-center ${mutedClass}`}>
        Already have an account?{" "}
        <Link to="/login" className="font-medium hover:underline" style={{ color: "#e09615" }}>Sign in</Link>
      </p>
    </form>
  );

  // Dark mode: centered card layout
  if (isDark) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle variant="landing" />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Logo size="lg" />
            </div>
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Choose your role and get started</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <RadioGroup value={gender} onValueChange={(v) => setGender(v as "male" | "female")} className="flex gap-4">
                  <Label htmlFor="gender-male" className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 cursor-pointer transition-all ${gender === "male" ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"}`}>
                    <RadioGroupItem value="male" id="gender-male" className="sr-only" />
                    <span className="text-sm font-medium">Male</span>
                  </Label>
                  <Label htmlFor="gender-female" className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 cursor-pointer transition-all ${gender === "female" ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"}`}>
                    <RadioGroupItem value="female" id="gender-female" className="sr-only" />
                    <span className="text-sm font-medium">Female</span>
                  </Label>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none" tabIndex={-1}>
                    {showPassword ? <EyeOff size={18} color="#e09615" /> : <Eye size={18} color="#e09615" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="backupEmail">Recovery Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input id="backupEmail" type="email" placeholder="backup@email.com" value={backupEmail} onChange={(e) => setBackupEmail(e.target.value)} />
                <p className="text-xs text-muted-foreground">Used for password recovery if you lose access to your primary email</p>
              </div>
              <div className="space-y-3">
                <Label>I am a...</Label>
                <RadioGroup value={role} onValueChange={(v) => setRole(v as "organization_owner" | "teacher")} className="grid grid-cols-2 gap-3">
                  <Label htmlFor="org-owner" className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all ${role === "organization_owner" ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"}`}>
                    <RadioGroupItem value="organization_owner" id="org-owner" className="sr-only" />
                    <Building2 className="h-8 w-8 text-accent" />
                    <span className="text-sm font-medium text-center">Organization Owner</span>
                  </Label>
                  <Label htmlFor="teacher" className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all ${role === "teacher" ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"}`}>
                    <RadioGroupItem value="teacher" id="teacher" className="sr-only" />
                    <GraduationCap className="h-8 w-8 text-accent" />
                    <span className="text-sm font-medium">Teacher</span>
                  </Label>
                </RadioGroup>
              </div>
              {role === "teacher" && organizations.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="organization">Join an Organization <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <select
                    id="organization"
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">No organization (independent)</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Select an organization to join, or sign up independently</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading} style={{ backgroundColor: "#e09615", color: "#fff", border: "none" }}>
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-medium hover:underline" style={{ color: "#e09615" }}>Sign in</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // Light mode: split layout
  return (
    <div className="flex min-h-screen">
      {/* Left panel — dark navy branding */}
      <div
        className="hidden md:flex md:w-[42%] flex-col items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: "#1e2235" }}
      >
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }} />
        <div className="relative z-10 flex flex-col items-center text-center px-8">
          <div className="flex items-center gap-3 mb-6">
            <GraduationCap className="h-10 w-10" style={{ color: "#e09615" }} />
            <span className="font-serif text-3xl font-bold tracking-wide" style={{ color: "#e09615" }}>
              QuizFlow
            </span>
          </div>
          <p className="text-lg font-light max-w-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
            Build, distribute, and evaluate exams — effortlessly.
          </p>
          <div className="mt-8 h-px w-16" style={{ backgroundColor: "rgba(224,150,21,0.3)" }} />
        </div>
      </div>

      {/* Right panel — white form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative overflow-y-auto" style={{ backgroundColor: "#ffffff" }}>
        <div className="absolute top-4 right-4">
          <ThemeToggle variant="landing" />
        </div>
        <div className="md:hidden mb-8">
          <Logo size="lg" />
        </div>
        {formContent}
      </div>
    </div>
  );
};

export default Signup;
