import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleSidebar } from "@/components/RoleSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";
import StudentFormSettings from "@/components/StudentFormSettings";

const StudentForm = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : "U";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[hsl(var(--dashboard-bg))]">
        <RoleSidebar />
        <div className="flex-1 flex flex-col">
          {/* Topbar */}
          <header className="h-14 flex items-center justify-between border-b border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-bg))] px-5">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-white/60 hover:text-white/80" />
              <span className="inline-flex items-center rounded-full border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] px-3 py-1 font-mono text-[10px] tracking-[0.15em] uppercase text-white/60">
                Org / Student Form
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--dashboard-gold))] font-mono text-[12px] font-bold text-[hsl(var(--dashboard-bg))]">
                {initials}
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-white/45 transition-colors hover:text-white/70"
              >
                <LogOut className="h-3 w-3" />
                Sign out
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-white/95 mb-2">
              Student Identification Form
            </h1>
            <p className="font-mono text-[11px] text-white/50 mb-8">
              Configure the fields students fill out before starting an exam
            </p>

            <div className="max-w-2xl">
              <StudentFormSettings />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default StudentForm;
