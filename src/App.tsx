import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthRedirect from "@/components/AuthRedirect";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import OwnerDashboard from "./pages/OwnerDashboard.tsx";
import TeacherDashboard from "./pages/TeacherDashboard.tsx";
import CreateExam from "./pages/CreateExam.tsx";
import ExamsList from "./pages/ExamsList.tsx";
import TakeExam from "./pages/TakeExam.tsx";
import Submissions from "./pages/Submissions.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
            <Route path="/signup" element={<AuthRedirect><Signup /></AuthRedirect>} />
            <Route path="/dashboard/owner" element={<ProtectedRoute allowedRole="organization_owner"><OwnerDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/owner/exams" element={<ProtectedRoute allowedRole="organization_owner"><ExamsList /></ProtectedRoute>} />
            <Route path="/dashboard/owner/create-exam" element={<ProtectedRoute allowedRole="organization_owner"><CreateExam /></ProtectedRoute>} />
            <Route path="/dashboard/owner/submissions" element={<ProtectedRoute allowedRole="organization_owner"><Submissions /></ProtectedRoute>} />
            <Route path="/dashboard/teacher" element={<ProtectedRoute allowedRole="teacher"><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/exam/:id" element={<TakeExam />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
