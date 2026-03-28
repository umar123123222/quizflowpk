import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleSidebar } from "@/components/RoleSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, LogOut, Loader2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Exam {
  id: string;
  title: string;
  description: string | null;
  created_at: string | null;
  is_published: boolean | null;
  time_limit: number | null;
  code: string;
  teacher_name?: string;
}

const ExamsList = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const copyExamLink = async (code: string) => {
    const link = `${window.location.origin}/exam/${code}`;
    await navigator.clipboard.writeText(link);
    toast({ title: "Link copied!", description: "Shareable exam link copied to clipboard." });
  };
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      if (!user) return;

      if (role === "teacher") {
        // Teachers only see their own exams
        const { data, error } = await supabase
          .from("exams")
          .select("id, title, description, created_at, is_published, time_limit")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false });
        if (!error && data) setExams(data);
      } else {
        // Owner sees all exams in their org with teacher names
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("owner_id", user.id)
          .single();

        if (org) {
          const { data, error } = await supabase
            .from("exams")
            .select("id, title, description, created_at, is_published, time_limit, created_by")
            .eq("organization_id", org.id)
            .order("created_at", { ascending: false });

          if (!error && data) {
            // Fetch teacher names
            const teacherIds = [...new Set(data.map((e) => e.created_by))];
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", teacherIds);
            const nameMap = new Map((profiles || []).map((p) => [p.id, p.full_name || "Unknown"]));
            setExams(data.map((e) => ({ ...e, teacher_name: nameMap.get(e.created_by) || "Unknown" })));
          }
        }
      }
      setLoading(false);
    };
    fetchExams();
  }, [user, role]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[hsl(var(--dashboard-bg))]">
        <RoleSidebar />
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
                <p className="font-mono text-[10px] text-white/25">Only teachers can create exams</p>
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
                      {exam.teacher_name && (
                        <p className="font-mono text-[10px] text-white/30 mb-2">
                          By: <span className="text-white/50">{exam.teacher_name}</span>
                        </p>
                      )}
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
                      <div className="flex gap-2">
                        {role === "teacher" && (
                          <button
                            onClick={() => navigate(`/dashboard/owner/create-exam?edit=${exam.id}`)}
                            className="flex-1 rounded-md border border-[hsl(var(--dashboard-border))] py-1.5 font-mono text-[10px] tracking-wider uppercase text-white/40 transition-colors hover:border-[hsl(var(--dashboard-gold)/0.4)] hover:text-white/60"
                          >
                            View / Edit
                          </button>
                        )}
                        <button
                          onClick={() => copyExamLink(exam.id)}
                          title="Copy shareable link"
                          className={`flex items-center justify-center rounded-md border border-[hsl(var(--dashboard-border))] px-2.5 py-1.5 text-white/30 transition-colors hover:border-[hsl(var(--dashboard-gold)/0.4)] hover:text-[hsl(var(--dashboard-gold))] ${role === "organization_owner" ? "flex-1" : ""}`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {role === "organization_owner" && <span className="ml-1.5 font-mono text-[10px] tracking-wider uppercase">Copy Link</span>}
                        </button>
                      </div>
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
