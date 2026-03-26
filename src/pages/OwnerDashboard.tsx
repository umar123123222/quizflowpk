import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { Routes, Route } from "react-router-dom";
import OwnerHome from "@/components/owner/OwnerHome";
import ExamBuilder from "@/components/owner/ExamBuilder";

const OwnerDashboard = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <OwnerSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-background px-4">
            <SidebarTrigger className="mr-4" />
            <h2 className="text-lg font-semibold font-display">Organization Dashboard</h2>
          </header>
          <main className="flex-1 bg-secondary/30 p-6">
            <Routes>
              <Route index element={<OwnerHome />} />
              <Route path="exams" element={<PlaceholderPage title="Exams" />} />
              <Route path="users" element={<PlaceholderPage title="Users" />} />
              <Route path="results" element={<PlaceholderPage title="Results" />} />
              <Route path="settings" element={<PlaceholderPage title="Settings" />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const PlaceholderPage = ({ title }: { title: string }) => (
  <div>
    <h1 className="text-3xl font-bold mb-4">{title}</h1>
    <p className="text-muted-foreground">This section is coming soon.</p>
  </div>
);

export default OwnerDashboard;
