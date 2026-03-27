import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Plus, LogOut, Loader2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Exam {
  id: string;
  title: string;
  description: string | null;
  created_at: string | null;
  is_published: boolean | null;
  time_limit: number | null;
}

const ExamsList = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("id, title, description, created_at, is_published, time_limit")
        .order("created_at", { ascending: false });

      if (!error && data) setExams(data);
      setLoading(false);
    };
    fetchExams();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[hsl(var(--dashboard-bg))]">
        <OwnerSidebar />
        <div className="flex-1 flex flex-col">
          {/* Topbar */}
          <header className="h-14 flex items-center justify-between border-b border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-bg))] px-5">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-white/40 hover:text-white/70" />
              <span className="inline-flex items-center rounded-full border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] px-3 py-1 font-mono text-[10px] tracking-[0.15em] uppercase text-white/40">
                Org / Exams
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--dashboard-gold))] font-mono text-[12px] font-bold text-[hsl(var(--dashboard-bg))]">
                {user?.user_metadata?.full_name
                  ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
                  : "U"}
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-white/25 transition-colors hover:text-white/50"
              >
                <LogOut className="h-3 w-3" />
                Sign out
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 md:p-10">
            <div className="flex items-center justify-between mb-8">
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-white/90">Exams</h1>
              <button
                onClick={() => navigate("/dashboard/owner/create-exam")}
                className="flex items-center gap-2 rounded-lg border border-[hsl(var(--dashboard-gold))] bg-[hsl(var(--dashboard-gold)/0.1)] px-4 py-2 font-mono text-[11px] tracking-wider uppercase text-[hsl(var(--dashboard-gold))] transition-colors hover:bg-[hsl(var(--dashboard-gold)/0.2)]"
              >
                <Plus className="h-3.5 w-3.5" />
                New Exam
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-white/30" />
              </div>
            ) : exams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] mb-4">
                  <FileText className="h-6 w-6 text-white/20" />
                </div>
                <p className="text-sm text-white/50 mb-1">No exams yet</p>
                <p className="font-mono text-[10px] text-white/25 mb-6">Create your first exam to get started</p>
                <button
                  onClick={() => navigate("/dashboard/owner/create-exam")}
                  className="flex items-center gap-2 rounded-lg border border-[hsl(var(--dashboard-gold))] bg-[hsl(var(--dashboard-gold)/0.1)] px-4 py-2 font-mono text-[11px] tracking-wider uppercase text-[hsl(var(--dashboard-gold))] transition-colors hover:bg-[hsl(var(--dashboard-gold)/0.2)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Exam
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    className="group rounded-lg border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] overflow-hidden transition-all duration-200 hover:border-[hsl(var(--dashboard-gold))]"
                  >
                    <div className="h-[2px] bg-[hsl(var(--dashboard-gold))]" />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-serif text-lg font-bold text-white/85 group-hover:text-[hsl(var(--dashboard-gold))] transition-colors line-clamp-1">
                          {exam.title}
                        </h3>
                        <span
                          className={`shrink-0 ml-2 inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[9px] tracking-wider uppercase ${
                            exam.is_published
                              ? "bg-[hsl(var(--dashboard-green)/0.15)] text-[hsl(var(--dashboard-green))]"
                              : "bg-white/5 text-white/30"
                          }`}
                        >
                          {exam.is_published ? "Published" : "Draft"}
                        </span>
                      </div>
                      {exam.description && (
                        <p className="text-xs text-white/35 mb-3 line-clamp-2">{exam.description}</p>
                      )}
                      <div className="flex items-center gap-3 mb-4">
                        {exam.time_limit && (
                          <span className="font-mono text-[10px] text-white/25">
                            {exam.time_limit} min
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-white/25">
                          {exam.created_at
                            ? new Date(exam.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </span>
                      </div>
                      <button
                        onClick={() => navigate(`/dashboard/owner/create-exam?edit=${exam.id}`)}
                        className="w-full rounded-md border border-[hsl(var(--dashboard-border))] py-1.5 font-mono text-[10px] tracking-wider uppercase text-white/40 transition-colors hover:border-[hsl(var(--dashboard-gold)/0.4)] hover:text-white/60"
                      >
                        View / Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ExamsList;
