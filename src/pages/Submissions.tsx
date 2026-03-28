import { useEffect, useState, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleSidebar } from "@/components/RoleSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ClipboardList, ChevronDown, ChevronRight, ShieldAlert, Eye, Download, Search, RotateCcw, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const { toast } = useToast();
  const [examsWithSubs, setExamsWithSubs] = useState<ExamWithSubmissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [reattemptDialogExamId, setReattemptDialogExamId] = useState<string | null>(null);
  const [reattemptEmails, setReattemptEmails] = useState<string[]>([""]);
  const [savingReattempts, setSavingReattempts] = useState(false);
  const filteredExams = useMemo(() => {
    return examsWithSubs.map((exam) => {
      let subs = exam.submissions;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        subs = subs.filter(
          (s) =>
            s.student.full_name.toLowerCase().includes(q) ||
            (s.student.email && s.student.email.toLowerCase().includes(q)) ||
            (s.student.phone && s.student.phone.toLowerCase().includes(q))
        );
      }

      if (scoreFilter !== "all") {
        const [min, max] = scoreFilter.split("-").map(Number);
        subs = subs.filter((s) => {
          const score = s.score ?? 0;
          return score >= min && score <= max;
        });
      }

      subs = [...subs].sort((a, b) => {
        const da = new Date(a.submitted_at || 0).getTime();
        const db = new Date(b.submitted_at || 0).getTime();
        return sortOrder === "newest" ? db - da : da - db;
      });

      return { ...exam, submissions: subs };
    });
  }, [examsWithSubs, searchQuery, scoreFilter, sortOrder]);

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

  const handleSaveReattempts = async () => {
    if (!reattemptDialogExamId || !user) return;
    const validEmails = reattemptEmails
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (validEmails.length === 0) {
      toast({ title: "No valid emails", description: "Please enter at least one valid email.", variant: "destructive" });
      return;
    }

    setSavingReattempts(true);
    try {
      // Delete old submissions for these students so they can retake
      // Insert reattempt permissions (upsert to handle duplicates)
      const rows = validEmails.map((email) => ({
        exam_id: reattemptDialogExamId,
        student_email: email,
        granted_by: user.id,
        used: false,
      }));

      const { error } = await supabase.from("exam_reattempts" as any).upsert(rows, {
        onConflict: "exam_id,student_email",
      });

      if (error) throw error;

      toast({ title: "Reattempts granted", description: `${validEmails.length} student(s) can now retake the exam.` });
      setReattemptDialogExamId(null);
      setReattemptEmails([""]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save reattempts.", variant: "destructive" });
    } finally {
      setSavingReattempts(false);
    }
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
        <RoleSidebar />
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
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h1 className="font-serif text-3xl md:text-4xl font-bold text-white/90">
                  Submissions
                </h1>
                <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-white/30 mt-2">
                  Student attempts across all exams
                </p>
              </div>
              {examsWithSubs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] text-white/60 hover:text-white/90 font-mono text-[10px] tracking-wider uppercase"
                  onClick={() => {
                    const rows: string[][] = [["Exam", "Name", "Email", "Phone", "Score", "Status", "Violations", "Date"]];
                    examsWithSubs.forEach((exam) => {
                      exam.submissions.forEach((sub) => {
                        const violations = sub.violations && sub.violations.length > 0
                          ? sub.violations.map((v) => v.type).join("; ")
                          : "None";
                        const date = sub.submitted_at
                          ? new Date(sub.submitted_at).toLocaleString("en-US")
                          : "—";
                        rows.push([
                          exam.title,
                          sub.student.full_name,
                          sub.student.email || "—",
                          sub.student.phone || "—",
                          sub.score !== null ? `${sub.score}%` : "—",
                          (sub.score ?? 0) >= 50 ? "Pass" : "Fail",
                          violations,
                          date,
                        ]);
                      });
                    });
                    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `submissions_${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast({ title: "Exported", description: "CSV file downloaded successfully." });
                  }}
                >
                  <Download className="h-3 w-3 mr-1.5" />
                  Export CSV
                </Button>
              )}
            </div>

            {/* Search & Filter Bar */}
            {examsWithSubs.length > 0 && (
              <div className="mb-6 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-[hsl(var(--dashboard-card))] border-[hsl(var(--dashboard-border))] text-white/80 placeholder:text-white/25 font-mono text-xs"
                  />
                </div>
                <select
                  value={scoreFilter}
                  onChange={(e) => setScoreFilter(e.target.value)}
                  className="h-9 rounded-md border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] px-3 font-mono text-[10px] tracking-wider uppercase text-white/60 outline-none"
                >
                  <option value="all">All Scores</option>
                  <option value="0-25">0–25%</option>
                  <option value="26-50">26–50%</option>
                  <option value="51-75">51–75%</option>
                  <option value="76-100">76–100%</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="h-9 rounded-md border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] px-3 font-mono text-[10px] tracking-wider uppercase text-white/60 outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            )}

            {loading ? (
              <p className="text-white/40 animate-pulse font-mono text-sm">Loading submissions...</p>
            ) : examsWithSubs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <ClipboardList className="h-12 w-12 text-white/15 mb-4" />
                <p className="text-white/40 font-mono text-sm">No exams found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredExams.map((exam) => {
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
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/40 text-center">Status</TableHead>
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/40">Violations</TableHead>
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/40 text-right">Date</TableHead>
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/40 text-center">Details</TableHead>
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
                                    <TableCell className="text-center">
                                      <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                                          (sub.score ?? 0) >= 50
                                            ? "bg-[hsl(var(--dashboard-green)/0.15)] text-[hsl(var(--dashboard-green))]"
                                            : "bg-destructive/15 text-destructive"
                                        }`}
                                      >
                                        {(sub.score ?? 0) >= 50 ? "Pass" : "Fail"}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      {sub.violations && sub.violations.length > 0 ? (
                                        <div className="space-y-1">
                                          {sub.violations.map((v, vi) => (
                                            <div key={vi} className="flex items-center gap-1.5">
                                              <ShieldAlert className="h-3 w-3 text-destructive shrink-0" />
                                              <span className="font-mono text-[10px] text-destructive/80">
                                                {v.type} at{" "}
                                                {new Date(v.timestamp).toLocaleTimeString("en-US", {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                  second: "2-digit",
                                                })}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="font-mono text-[10px] text-white/20">No violations</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="font-mono text-[11px] text-white/40 text-right">
                                      {formatDate(sub.submitted_at)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-[10px] font-mono tracking-wider uppercase text-white/40 hover:text-white/70"
                                        onClick={() => window.open(`/submission/${sub.id}`, "_blank")}
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        View
                                      </Button>
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
