import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, BarChart3 } from "lucide-react";

const stats = [
  { title: "Total Exams", value: "0", icon: FileText, description: "Exams created" },
  { title: "Total Students", value: "0", icon: Users, description: "Enrolled students" },
  { title: "Total Submissions", value: "0", icon: BarChart3, description: "Exam submissions" },
];

const OwnerHome = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Welcome back</h1>
      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className="rounded-md bg-accent/10 p-2">
                <stat.icon className="h-4 w-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OwnerHome;
