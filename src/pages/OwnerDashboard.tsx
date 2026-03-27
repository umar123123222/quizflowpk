import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FileText, BarChart3, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OwnerDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <nav className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-accent" />
            <span className="text-xl font-bold font-display">Owner Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Welcome, Organization Owner</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Teachers", value: "0", icon: Users },
            { title: "Quizzes", value: "0", icon: FileText },
            { title: "Submissions", value: "0", icon: BarChart3 },
            { title: "Organizations", value: "1", icon: Building2 },
          ].map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default OwnerDashboard;
