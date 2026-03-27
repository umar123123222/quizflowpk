import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
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

const stats = [
  {
    label: "Total Exams",
    value: 24,
    icon: FileText,
    accent: "var(--dashboard-gold)",
  },
  {
    label: "Total Students",
    value: 156,
    icon: Users,
    accent: "var(--dashboard-blue)",
  },
  {
    label: "Total Submissions",
    value: 482,
    icon: ClipboardList,
    accent: "var(--dashboard-green)",
  },
];

// quickActions moved inside component for navigate access

const OwnerDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[hsl(var(--dashboard-bg))]">
        <OwnerSidebar />
        <div className="flex-1 flex flex-col">
          {/* Topbar */}
          <header className="h-14 flex items-center justify-between border-b border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-bg))] px-5">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-white/40 hover:text-white/70" />
              <span className="inline-flex items-center rounded-full border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] px-3 py-1 font-mono text-[10px] tracking-[0.15em] uppercase text-white/40">
                Org / Dashboard
              </span>
            </div>
            <div className="flex items-center gap-3">
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
                className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-white/25 transition-colors hover:text-white/50"
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
              <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-white/30 mb-2">
                {today}
              </p>
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-white/90">
                Welcome <span className="text-[hsl(var(--dashboard-gold))]">back.</span>
              </h1>
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
                    <p className="font-serif text-3xl font-bold text-white/90">
                      {stat.value}
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-white/35 mt-1.5">
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mb-4">
              <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-white/30 mb-4">
                Quick Actions
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {quickActions.map((action) => (
                <button
                  key={action.title}
                  onClick={action.onClick}
                  className="group flex items-center gap-4 rounded-lg border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] p-4 text-left transition-all duration-200 hover:border-[hsl(var(--dashboard-gold))]"
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
                    <p className="text-sm font-medium text-white/80 group-hover:text-[hsl(var(--dashboard-gold))] transition-colors">
                      {action.title}
                    </p>
                    <p className="font-mono text-[10px] text-white/30 mt-0.5">
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
