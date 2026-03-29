import { FileText, Users, BarChart3, Settings, LogOut, ClipboardList, FormInput } from "lucide-react";
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
  { title: "Dashboard", url: "/dashboard/owner", icon: FileText },
  { title: "Exams", url: "/dashboard/owner/exams", icon: ClipboardList },
  { title: "Users", url: "/dashboard/owner/users", icon: Users },
  { title: "Submissions", url: "/dashboard/owner/submissions", icon: BarChart3 },
  { title: "Student Form", url: "/dashboard/owner/student-form", icon: FormInput },
  { title: "Settings", url: "/dashboard/owner/settings", icon: Settings },
];

export function OwnerSidebar() {
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
    <Sidebar collapsible="icon" className="border-r border-[hsl(228,20%,22%)]" style={{ backgroundColor: '#1e2235' }}>
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
                              ? "bg-[#e09615] text-white border-l-2 border-[#e09615]"
                              : "border-l-2 border-transparent text-[#6b7494] hover:text-[#e09615] hover:bg-[rgba(224,150,21,0.04)]"
                          }`
                        }
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            isActive ? "bg-white" : "bg-[#6b7494]/30 group-hover:bg-[rgba(224,150,21,0.5)]"
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

      <SidebarFooter className="px-4 py-4 border-t border-[hsl(228,20%,22%)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e09615] font-mono text-xs font-medium text-white">">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {user?.user_metadata?.full_name || "Owner"}
              </p>
              <p className="font-mono text-[10px] text-[#4a5070] truncate">
                {user?.email}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-[hsl(228,20%,22%)] px-3 py-1.5 font-mono text-[10px] tracking-wider uppercase text-white/60 transition-colors hover:border-[rgba(224,150,21,0.4)] hover:text-white/75"
        >
          <LogOut className="h-3 w-3" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
