import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  Users,
  ClipboardList,
  Plus,
  UserPlus,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const OwnerDashboard = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: examCount = 0 } = useQuery({
    queryKey: ["examCount"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("exams")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: teacherCount = 0 } = useQuery({
    queryKey: ["teacherCount"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("organization_teachers")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: submissionCount = 0 } = useQuery({
    queryKey: ["submissionCount"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const stats = [
    { label: "Total Exams", value: examCount, icon: FileText, accent: "var(--dashboard-gold)" },
    { label: "Total Teachers", value: teacherCount, icon: Users, accent: "var(--dashboard-blue)" },
    { label: "Total Submissions", value: submissionCount, icon: ClipboardList, accent: "var(--dashboard-green)" },
  ];

  const quickActions = [
    {
      title: "Add Teachers",
      subtitle: "Manage your organization teachers",
      icon: UserPlus,
      accent: "var(--dashboard-blue)",
      onClick: () => navigate("/dashboard/owner/users"),
    },
    {
      title: "View Results",
      subtitle: "Browse submission analytics",
      icon: BarChart3,
      accent: "var(--dashboard-green)",
      onClick: () => navigate("/dashboard/owner/submissions"),
    },
    {
      title: "Settings",
      subtitle: "Organization preferences",
      icon: Settings,
      accent: "var(--dashboard-gold)",
      onClick: () => navigate("/dashboard/owner/settings"),
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const now = new Date();
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const rest = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const today = `${weekday} ${rest}`;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[hsl(var(--dashboard-bg))]">
        <OwnerSidebar />
        <div className="flex-1 flex flex-col">
          {/* Topbar */}
          <header className="h-14 flex items-center justify-between border-b border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] px-5">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-[hsl(var(--dashboard-text)/.7)] hover:text-[hsl(var(--dashboard-text)/.95)]" />
              <span className="inline-flex items-center rounded-full border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] px-3 py-1 font-mono text-[10px] tracking-[0.15em] uppercase text-[hsl(var(--dashboard-text)/.8)]">
                Org / <span className="text-[hsl(var(--dashboard-gold))]">Dashboard</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--dashboard-gold))] font-mono text-[12px] font-bold text-[hsl(var(--dashboard-bg))]">
                {user?.user_metadata?.full_name
                  ? user.user_metadata.full_name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                  : "U"}
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
          <main className="flex-1 p-6 md:p-10">
            {/* Welcome */}
            <div className="mb-10">
              <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-[hsl(var(--dashboard-text)/.7)] mb-2">
                {today}
              </p>
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-[hsl(var(--dashboard-text)/.95)]">
                Welcome <span className="text-[hsl(var(--dashboard-gold))]">back,</span>
              </h1>
              {user?.user_metadata?.full_name && (
                <p className="font-serif text-lg md:text-xl text-[hsl(var(--dashboard-text)/.7)] mt-2">
                  {user.user_metadata.gender === "male" ? "Mr." : "Miss"}{" "}
                  <span className="text-[hsl(var(--dashboard-gold))]">{user.user_metadata.full_name.split(" ")[0]}</span>
                </p>
              )}
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] overflow-hidden"
                >
                  <div
                    className="h-[2px]"
                    style={{ backgroundColor: `hsl(${stat.accent})` }}
                  />
                  <div className="p-5">
                    <p className="font-serif text-3xl font-bold text-[hsl(var(--dashboard-text)/.95)]">
                      {stat.value}
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[hsl(var(--dashboard-text)/.75)] mt-1.5">
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mb-4">
              <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[hsl(var(--dashboard-text)/.7)] mb-4">
                Quick Actions
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {quickActions.map((action) => (
                <button
                  key={action.title}
                  onClick={action.onClick}
                  className="group flex items-center gap-4 rounded-lg border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-dark-card))] p-4 text-left transition-all duration-200 hover:border-[hsl(var(--dashboard-gold))]"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                    style={{
                      backgroundColor: `hsl(${action.accent} / 0.12)`,
                    }}
                  >
                    <action.icon
                      className="h-4 w-4"
                      style={{ color: `hsl(${action.accent})` }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/90 group-hover:text-[hsl(var(--dashboard-gold))] transition-colors">
                      {action.title}
                    </p>
                    <p className="font-mono text-[10px] text-white/50 mt-0.5">
                      {action.subtitle}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default OwnerDashboard;
