import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const AuthRedirect = ({ children }: { children: React.ReactNode }) => {
  const { session, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (session && role) {
    const redirectPath = role === "organization_owner" ? "/dashboard/owner" : "/dashboard/teacher";
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default AuthRedirect;
