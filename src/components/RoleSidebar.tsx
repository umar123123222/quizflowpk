import { useAuth } from "@/contexts/AuthContext";
import { OwnerSidebar } from "./OwnerSidebar";
import { TeacherSidebar } from "./TeacherSidebar";

export function RoleSidebar() {
  const { role } = useAuth();
  return role === "teacher" ? <TeacherSidebar /> : <OwnerSidebar />;
}
