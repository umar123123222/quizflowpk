import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const { signIn, role, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (session && role) {
      const path = role === "organization_owner" ? "/dashboard/owner" : "/dashboard/teacher";
      navigate(path, { replace: true });
    }
  }, [session, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      toast({ title: "Welcome back!", description: "Redirecting to your dashboard..." });
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
      <div>
        <h1 className={`text-2xl font-serif font-bold ${isDark ? "text-foreground" : "text-[#0f1117]"}`}>Welcome back</h1>
        <p className={`text-sm mt-1 ${isDark ? "text-muted-foreground" : "text-[#6b7494]"}`}>Sign in to your account</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className={isDark ? "" : "text-[#0f1117] font-medium"}>Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={isDark ? "" : "bg-white border-[#d0d4de] text-[#0f1117] placeholder:text-[#6b7494]/60 focus-visible:ring-[#e09615]/40"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className={isDark ? "" : "text-[#0f1117] font-medium"}>Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`pr-10 ${isDark ? "" : "bg-white border-[#d0d4de] text-[#0f1117] placeholder:text-[#6b7494]/60 focus-visible:ring-[#e09615]/40"}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} color="#e09615" /> : <Eye size={18} color="#e09615" />}
            </button>
          </div>
        </div>
      </div>
      <Button
        type="submit"
        className="w-full border-0 font-semibold"
        disabled={isLoading}
        style={{ backgroundColor: "#e09615", color: "#fff" }}
      >
        {isLoading ? "Signing in..." : "Sign in"}
      </Button>
      <div className="flex flex-col items-center gap-2">
        <Link to="/forgot-password" className="text-sm hover:underline" style={{ color: "#e09615" }}>
          Forgot Password?
        </Link>
        <p className={`text-sm ${isDark ? "text-muted-foreground" : "text-[#6b7494]"}`}>
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium hover:underline" style={{ color: "#e09615" }}>Sign up</Link>
        </p>
      </div>
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
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} color="#e09615" /> : <Eye size={18} color="#e09615" />}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading} style={{ backgroundColor: "#e09615", color: "#fff", border: "none" }}>
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
              <Link to="/forgot-password" className="text-sm hover:underline" style={{ color: "#e09615" }}>
                Forgot Password?
              </Link>
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="font-medium hover:underline" style={{ color: "#e09615" }}>Sign up</Link>
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
        className="hidden md:flex md:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: "#1e2235" }}
      >
        {/* Subtle decorative pattern */}
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
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative" style={{ backgroundColor: "#ffffff" }}>
        <div className="absolute top-4 right-4">
          <ThemeToggle variant="landing" />
        </div>
        {/* Mobile logo */}
        <div className="md:hidden mb-8">
          <Logo size="lg" />
        </div>
        {formContent}
      </div>
    </div>
  );
};

export default Login;
