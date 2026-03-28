import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building2, GraduationCap } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const { signUp } = useAuth();
  const { toast } = useToast();

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-primary p-1.5">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold font-display">QuizFlow</span>
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
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backupEmail">Recovery Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="backupEmail" type="email" placeholder="backup@email.com" value={backupEmail} onChange={(e) => setBackupEmail(e.target.value)} />
              <p className="text-xs text-muted-foreground">Used for password recovery if you lose access to your primary email</p>
            </div>
            <div className="space-y-3">
              <Label>I am a...</Label>
              <RadioGroup value={role} onValueChange={(v) => setRole(v as "organization_owner" | "teacher")} className="grid grid-cols-2 gap-3">
                <Label
                  htmlFor="org-owner"
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                    role === "organization_owner" ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
                  }`}
                >
                  <RadioGroupItem value="organization_owner" id="org-owner" className="sr-only" />
                  <Building2 className="h-8 w-8 text-accent" />
                  <span className="text-sm font-medium text-center">Organization Owner</span>
                </Label>
                <Label
                  htmlFor="teacher"
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                    role === "teacher" ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
                  }`}
                >
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-accent font-medium hover:underline">Sign in</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Signup;
