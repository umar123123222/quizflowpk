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
import ForgotPassword from "./pages/ForgotPassword.tsx";
import OwnerDashboard from "./pages/OwnerDashboard.tsx";
import TeacherDashboard from "./pages/TeacherDashboard.tsx";
import CreateExam from "./pages/CreateExam.tsx";
import ExamsList from "./pages/ExamsList.tsx";
import TakeExam from "./pages/TakeExam.tsx";
import Submissions from "./pages/Submissions.tsx";
import ViewSubmission from "./pages/ViewSubmission.tsx";
import Settings from "./pages/Settings.tsx";
import Users from "./pages/Users.tsx";
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
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/dashboard/owner" element={<ProtectedRoute allowedRole="organization_owner"><OwnerDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/owner/exams" element={<ProtectedRoute><ExamsList /></ProtectedRoute>} />
            <Route path="/dashboard/owner/create-exam" element={<ProtectedRoute><CreateExam /></ProtectedRoute>} />
            <Route path="/dashboard/owner/submissions" element={<ProtectedRoute><Submissions /></ProtectedRoute>} />
            <Route path="/dashboard/owner/settings" element={<ProtectedRoute allowedRole="organization_owner"><Settings /></ProtectedRoute>} />
            <Route path="/dashboard/owner/users" element={<ProtectedRoute allowedRole="organization_owner"><Users /></ProtectedRoute>} />
            <Route path="/dashboard/teacher" element={<ProtectedRoute allowedRole="teacher"><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/teacher/settings" element={<ProtectedRoute allowedRole="teacher"><Settings /></ProtectedRoute>} />
            <Route path="/exam/:code" element={<TakeExam />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
