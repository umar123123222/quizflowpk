import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Users, ClipboardList } from "lucide-react";

const stats = [
  { label: "Total Exams", value: 24, icon: FileText },
  { label: "Total Students", value: 156, icon: Users },
  { label: "Total Submissions", value: 482, icon: ClipboardList },
];

const OwnerDashboard = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <OwnerSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-background px-4">
            <SidebarTrigger className="mr-4" />
            <h2 className="text-sm font-medium text-muted-foreground">
              Organization Owner
            </h2>
          </header>
          <main className="flex-1 p-6 md:p-8 bg-secondary/30">
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
                Welcome back 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                Here's an overview of your exam platform.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat) => (
                <Card
                  key={stat.label}
                  className="shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] transition-shadow"
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <stat.icon className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold font-display text-foreground">
                        {stat.value}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default OwnerDashboard;
