import { FileText, ClipboardList, Settings, LogOut, Plus } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/dashboard/teacher", icon: FileText },
  { title: "My Exams", url: "/dashboard/owner/exams", icon: ClipboardList },
  { title: "Create Exam", url: "/dashboard/owner/create-exam", icon: Plus },
  { title: "Submissions", url: "/dashboard/owner/submissions", icon: ClipboardList },
  { title: "Settings", url: "/dashboard/teacher/settings", icon: Settings },
];

export function TeacherSidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <Sidebar collapsible="icon" className="border-r border-[hsl(var(--dashboard-border))]">
      <SidebarHeader className="px-5 py-6">
        <Logo showText={!collapsed} />
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <RouterNavLink
                        to={item.url}
                        end
                        className={() =>
                          `group relative flex items-center gap-3 rounded-md px-3 py-2 font-mono text-xs tracking-wider uppercase transition-all duration-200 ${
                            isActive
                              ? "border-l-2 border-[hsl(var(--dashboard-gold))] bg-[hsl(var(--dashboard-gold)/0.08)] text-[hsl(var(--dashboard-gold))]"
                              : "border-l-2 border-transparent text-sidebar-foreground hover:text-[hsl(var(--dashboard-gold))] hover:bg-[hsl(var(--dashboard-gold)/0.04)]"
                          }`
                        }
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            isActive ? "bg-[hsl(var(--dashboard-gold))]" : "bg-sidebar-foreground/30 group-hover:bg-[hsl(var(--dashboard-gold)/0.5)]"
                          }`}
                        />
                        {!collapsed && <span>{item.title}</span>}
                      </RouterNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-4 border-t border-[hsl(var(--dashboard-border))]">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8C87A] font-mono text-xs font-medium text-[hsl(var(--dashboard-bg))]">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80 truncate">
                {user?.user_metadata?.full_name || "Teacher"}
              </p>
              <p className="font-mono text-[10px] text-sidebar-foreground/50 truncate">
                {user?.email}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-[hsl(var(--dashboard-border))] px-3 py-1.5 font-mono text-[10px] tracking-wider uppercase text-white/40 transition-colors hover:border-[hsl(var(--dashboard-gold)/0.4)] hover:text-white/60"
        >
          <LogOut className="h-3 w-3" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
