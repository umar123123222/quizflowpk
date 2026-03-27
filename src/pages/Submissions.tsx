import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ClipboardList, ChevronDown, ChevronRight, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ExamWithSubmissions {
  id: string;
  title: string;
  teacher_name?: string;
  submissions: {
    id: string;
    score: number | null;
    submitted_at: string | null;
    violations: Array<{ type: string; timestamp: string }> | null;
    student: {
      full_name: string;
      email: string | null;
      phone: string | null;
    };
  }[];
}

const Submissions = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [examsWithSubs, setExamsWithSubs] = useState<ExamWithSubmissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      let exams: { id: string; title: string; created_by?: string }[] | null = null;

      if (role === "teacher") {
        const { data } = await supabase
          .from("exams")
          .select("id, title")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false });
        exams = data;
      } else {
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("owner_id", user.id)
          .single();

        if (!org) { setLoading(false); return; }

        const { data } = await supabase
          .from("exams")
          .select("id, title, created_by")
          .eq("organization_id", org.id)
          .order("created_at", { ascending: false });
        exams = data;
      }

      if (!exams || exams.length === 0) { setLoading(false); return; }

      // For owners, fetch teacher names
      let teacherMap = new Map<string, string>();
      if (role === "organization_owner") {
        const teacherIds = [...new Set(exams.map((e) => e.created_by).filter(Boolean))] as string[];
        if (teacherIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", teacherIds);
          teacherMap = new Map((profiles || []).map((p) => [p.id, p.full_name || "Unknown"]));
        }
      }

      if (!exams || exams.length === 0) { setLoading(false); return; }

      // Get submissions with student info for all exams
      const results: ExamWithSubmissions[] = [];
      for (const exam of exams) {
        const { data: subs } = await supabase
          .from("submissions")
          .select("id, score, submitted_at, student_id, violations")
          .eq("exam_id", exam.id)
          .order("submitted_at", { ascending: false });

        if (!subs || subs.length === 0) {
          results.push({ ...exam, submissions: [] });
          continue;
        }

        // Get student details
        const studentIds = [...new Set(subs.map((s) => s.student_id))];
        const { data: students } = await supabase
          .from("students")
          .select("id, full_name, email, phone")
          .in("id", studentIds);

        const studentMap = new Map(
          (students || []).map((s) => [s.id, s])
        );

        results.push({
          ...exam,
          teacher_name: exam.created_by ? teacherMap.get(exam.created_by) : undefined,
          submissions: subs.map((s) => ({
            id: s.id,
            score: s.score,
            submitted_at: s.submitted_at,
            violations: (s as any).violations as Array<{ type: string; timestamp: string }> | null,
            student: studentMap.get(s.student_id) || {
              full_name: "Unknown",
              email: null,
              phone: null,
            },
          })),
        });
      }

      setExamsWithSubs(results);
      // Expand first exam by default
      if (results.length > 0) {
        setExpandedExams(new Set([results[0].id]));
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const toggleExam = (examId: string) => {
    setExpandedExams((prev) => {
      const next = new Set(prev);
      if (next.has(examId)) next.delete(examId);
      else next.add(examId);
      return next;
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
                Org / Submissions
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--dashboard-gold))] font-mono text-[12px] font-bold text-[hsl(var(--dashboard-bg))]">
                {user?.user_metadata?.full_name
                  ? user.user_metadata.full_name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
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

          {/* Main */}
          <main className="flex-1 p-6 md:p-10">
            <div className="mb-8">
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-white/90">
                Submissions
              </h1>
              <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-white/30 mt-2">
                Student attempts across all exams
              </p>
            </div>

            {loading ? (
              <p className="text-white/40 animate-pulse font-mono text-sm">Loading submissions...</p>
            ) : examsWithSubs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <ClipboardList className="h-12 w-12 text-white/15 mb-4" />
                <p className="text-white/40 font-mono text-sm">No exams found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {examsWithSubs.map((exam) => {
                  const isExpanded = expandedExams.has(exam.id);
                  return (
                    <div
                      key={exam.id}
                      className="rounded-lg border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] overflow-hidden"
                    >
                      {/* Exam header */}
                      <button
                        onClick={() => toggleExam(exam.id)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[hsl(var(--dashboard-gold)/0.04)] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-[hsl(var(--dashboard-gold))]" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-white/30" />
                          )}
                          <div>
                            <span className="font-serif text-base font-semibold text-white/85">
                              {exam.title}
                            </span>
                            {exam.teacher_name && (
                              <span className="ml-2 font-mono text-[10px] text-white/30">
                                by {exam.teacher_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono text-[10px] tracking-wider uppercase text-white/30">
                          {exam.submissions.length} submission{exam.submissions.length !== 1 ? "s" : ""}
                        </span>
                      </button>

                      {/* Submissions table */}
                      {isExpanded && (
                        <div className="border-t border-[hsl(var(--dashboard-border))]">
                          {exam.submissions.length === 0 ? (
                            <p className="px-5 py-6 text-center font-mono text-xs text-white/25">
                              No submissions yet
                            </p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow className="border-[hsl(var(--dashboard-border))] hover:bg-transparent">
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/40">Name</TableHead>
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/40">Email</TableHead>
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/40">Phone</TableHead>
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/40 text-right">Score</TableHead>
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/40">Violations</TableHead>
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/40 text-right">Date</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {exam.submissions.map((sub) => (
                                  <TableRow
                                    key={sub.id}
                                    className="border-[hsl(var(--dashboard-border))] hover:bg-[hsl(var(--dashboard-gold)/0.03)]"
                                  >
                                    <TableCell className="text-sm text-white/75 font-medium">
                                      {sub.student.full_name}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-white/50">
                                      {sub.student.email || "—"}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-white/50">
                                      {sub.student.phone || "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <span
                                        className={`font-mono text-sm font-bold ${
                                          (sub.score ?? 0) >= 70
                                            ? "text-[hsl(var(--dashboard-green))]"
                                            : (sub.score ?? 0) >= 40
                                            ? "text-[hsl(var(--dashboard-gold))]"
                                            : "text-destructive"
                                        }`}
                                      >
                                        {sub.score !== null ? `${sub.score}%` : "—"}
                                      </span>
                                    </TableCell>
                                    <TableCell className="font-mono text-[11px] text-white/40 text-right">
                                      {formatDate(sub.submitted_at)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Submissions;
