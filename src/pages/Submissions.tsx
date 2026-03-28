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
  hasTextQuestions?: boolean;
  submissions: {
    id: string;
    score: number | null;
    submitted_at: string | null;
    violations: Array<{ type: string; timestamp: string }> | null;
    isReviewed?: boolean;
    attemptLabel?: string;
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
  const [statusFilter, setStatusFilter] = useState<"all" | "auto_evaluated" | "pending_review">("all");
  const [reattemptDialogExamId, setReattemptDialogExamId] = useState<string | null>(null);
  const [reattemptEmails, setReattemptEmails] = useState<string[]>([""]);
  const [savingReattempts, setSavingReattempts] = useState(false);
  const filteredExams = useMemo(() => {
    // First filter exams by status filter
    let exams = examsWithSubs;
    if (statusFilter === "pending_review") {
      exams = exams.filter((e) => e.hasTextQuestions).map((e) => ({
        ...e,
        submissions: e.submissions.filter((s) => !s.isReviewed),
      }));
    } else if (statusFilter === "auto_evaluated") {
      exams = exams.filter((e) => !e.hasTextQuestions);
    }

    return exams.map((exam) => {
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
  }, [examsWithSubs, searchQuery, scoreFilter, sortOrder, statusFilter]);

  const pendingCount = useMemo(() => examsWithSubs.filter((e) => e.hasTextQuestions).reduce((sum, e) => sum + e.submissions.filter((s) => !s.isReviewed).length, 0), [examsWithSubs]);
  const autoCount = useMemo(() => examsWithSubs.filter((e) => !e.hasTextQuestions).reduce((sum, e) => sum + e.submissions.length, 0), [examsWithSubs]);
  const totalCount = useMemo(() => examsWithSubs.reduce((sum, e) => sum + e.submissions.length, 0), [examsWithSubs]);

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

      // Check which exams have text questions
      const examIds = exams.map((e) => e.id);
      const { data: textQs } = await supabase
        .from("questions")
        .select("exam_id")
        .in("exam_id", examIds)
        .eq("question_type", "text");
      const examsWithText = new Set((textQs || []).map((q) => q.exam_id));

      // Get submissions with student info for all exams
      const results: ExamWithSubmissions[] = [];
      for (const exam of exams) {
        const { data: subs } = await supabase
          .from("submissions")
          .select("id, score, submitted_at, student_id, violations, answers")
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

        const submissions = subs.map((s) => {
            const answersObj = (s as any).answers as Record<string, any> | null;
            return {
              id: s.id,
              score: s.score,
              submitted_at: s.submitted_at,
              violations: (s as any).violations as Array<{ type: string; timestamp: string }> | null,
              isReviewed: answersObj?._reviewed === true,
              attemptLabel: undefined as string | undefined,
              student: studentMap.get(s.student_id) || {
                full_name: "Unknown",
                email: null,
                phone: null,
              },
              _studentId: s.student_id,
            };
          });
            return {
              id: s.id,
              score: s.score,
              submitted_at: s.submitted_at,
              violations: (s as any).violations as Array<{ type: string; timestamp: string }> | null,
              isReviewed: answersObj?._reviewed === true,
              student: studentMap.get(s.student_id) || {
                full_name: "Unknown",
                email: null,
                phone: null,
              },
              _studentId: s.student_id,
            };
          });

        // Label attempts for students with multiple submissions
        const byStudent = new Map<string, typeof submissions>();
        submissions.forEach((s) => {
          const key = (s as any)._studentId;
          if (!byStudent.has(key)) byStudent.set(key, []);
          byStudent.get(key)!.push(s);
        });
        byStudent.forEach((studentSubs) => {
          if (studentSubs.length > 1) {
            // Sort oldest first for labeling
            const sorted = [...studentSubs].sort(
              (a, b) => new Date(a.submitted_at || 0).getTime() - new Date(b.submitted_at || 0).getTime()
            );
            sorted.forEach((s, i) => {
              s.attemptLabel = `Attempt ${i + 1}`;
            });
          }
        });

        results.push({
          ...exam,
          teacher_name: exam.created_by ? teacherMap.get(exam.created_by) : undefined,
          hasTextQuestions: examsWithText.has(exam.id),
          submissions,
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
              <SidebarTrigger className="text-white/60 hover:text-white/80" />
              <span className="inline-flex items-center rounded-full border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] px-3 py-1 font-mono text-[10px] tracking-[0.15em] uppercase text-white/60">
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
                className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-white/45 transition-colors hover:text-white/70"
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
                <h1 className="font-serif text-3xl md:text-4xl font-bold text-white/95">
                  Submissions
                </h1>
                <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-white/50 mt-2">
                  Student attempts across all exams
                </p>
              </div>
              {examsWithSubs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] text-white/75 hover:text-white/95 font-mono text-[10px] tracking-wider uppercase"
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
                          exam.hasTextQuestions ? (sub.isReviewed ? "Evaluated" : "Pending Review") : (sub.score ?? 0) >= 50 ? "Pass" : "Fail",
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

            {/* Status Filter Tabs */}
            {examsWithSubs.length > 0 && (
              <div className="mb-4 flex gap-1 rounded-lg border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] p-1 w-fit">
                {([
                  { key: "all" as const, label: "All", count: totalCount },
                  { key: "auto_evaluated" as const, label: "Auto Evaluated", count: autoCount },
                  { key: "pending_review" as const, label: "Pending Review", count: pendingCount },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[10px] tracking-wider uppercase transition-colors ${
                      statusFilter === tab.key
                        ? tab.key === "pending_review"
                          ? "bg-[hsl(var(--dashboard-gold)/0.15)] text-[hsl(var(--dashboard-gold))]"
                          : "bg-[hsl(var(--dashboard-gold)/0.1)] text-white/90"
                        : "text-white/55 hover:text-white/70"
                    }`}
                  >
                    {tab.label}
                    <span className={`inline-flex items-center justify-center rounded-full px-1.5 min-w-[18px] h-[18px] text-[9px] font-bold ${
                      statusFilter === tab.key
                        ? tab.key === "pending_review"
                          ? "bg-[hsl(var(--dashboard-gold)/0.25)] text-[hsl(var(--dashboard-gold))]"
                          : "bg-white/10 text-white/75"
                        : "bg-white/5 text-white/45"
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Search & Filter Bar */}
            {examsWithSubs.length > 0 && (
              <div className="mb-6 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-[hsl(var(--dashboard-card))] border-[hsl(var(--dashboard-border))] text-white/90 placeholder:text-white/50 font-mono text-xs"
                  />
                </div>
                <select
                  value={scoreFilter}
                  onChange={(e) => setScoreFilter(e.target.value)}
                  className="h-9 rounded-md border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] px-3 font-mono text-[10px] tracking-wider uppercase text-white/75 outline-none"
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
                  className="h-9 rounded-md border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] px-3 font-mono text-[10px] tracking-wider uppercase text-white/75 outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            )}

            {loading ? (
              <p className="text-white/60 animate-pulse font-mono text-sm">Loading submissions...</p>
            ) : examsWithSubs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <ClipboardList className="h-12 w-12 text-white/30 mb-4" />
                <p className="text-white/60 font-mono text-sm">No exams found</p>
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
                            <ChevronRight className="h-4 w-4 text-white/50" />
                          )}
                          <div>
                            <span className="font-serif text-base font-semibold text-white/92">
                              {exam.title}
                            </span>
                            {exam.teacher_name && (
                              <span className="ml-2 font-mono text-[10px] text-white/50">
                                by {exam.teacher_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] tracking-wider uppercase text-white/50">
                            {exam.submissions.length} submission{exam.submissions.length !== 1 ? "s" : ""}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px] font-mono tracking-wider uppercase text-white/60 hover:text-[hsl(var(--dashboard-gold))] hover:bg-[hsl(var(--dashboard-gold)/0.08)]"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReattemptDialogExamId(exam.id);
                              setReattemptEmails([""]);
                            }}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Allow Reattempt
                          </Button>
                        </div>
                      </button>

                      {/* Submissions table */}
                      {isExpanded && (
                        <div className="border-t border-[hsl(var(--dashboard-border))]">
                          {exam.submissions.length === 0 ? (
                            <p className="px-5 py-6 text-center font-mono text-xs text-white/45">
                              No submissions yet
                            </p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow className="border-[hsl(var(--dashboard-border))] hover:bg-transparent">
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/60">Name</TableHead>
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/60">Email</TableHead>
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/60">Phone</TableHead>
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/60 text-right">Score</TableHead>
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/60 text-center">Status</TableHead>
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/60">Violations</TableHead>
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/60 text-right">Date</TableHead>
                                  <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/60 text-center">Details</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {exam.submissions.map((sub) => (
                                  <TableRow
                                    key={sub.id}
                                    className="border-[hsl(var(--dashboard-border))] hover:bg-[hsl(var(--dashboard-gold)/0.03)]"
                                  >
                                    <TableCell className="text-sm text-white/85 font-medium">
                                      {sub.student.full_name}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-white/70">
                                      {sub.student.email || "—"}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-white/70">
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
                                      {(() => {
                                        const isPending = exam.hasTextQuestions && !sub.isReviewed;
                                        const isEvaluated = exam.hasTextQuestions && sub.isReviewed;
                                        const statusLabel = isPending ? "Pending Review" : isEvaluated ? "Evaluated" : (sub.score ?? 0) >= 50 ? "Pass" : "Fail";
                                        const statusClass = isPending
                                          ? "bg-[hsl(var(--dashboard-gold)/0.15)] text-[hsl(var(--dashboard-gold))]"
                                          : isEvaluated
                                          ? "bg-[hsl(var(--dashboard-green)/0.15)] text-[hsl(var(--dashboard-green))]"
                                          : (sub.score ?? 0) >= 50
                                          ? "bg-[hsl(var(--dashboard-green)/0.15)] text-[hsl(var(--dashboard-green))]"
                                          : "bg-destructive/15 text-destructive";
                                        return (
                                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${statusClass}`}>
                                            {statusLabel}
                                          </span>
                                        );
                                      })()}
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
                                        <span className="font-mono text-[10px] text-white/40">No violations</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="font-mono text-[11px] text-white/60 text-right">
                                      {formatDate(sub.submitted_at)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-[10px] font-mono tracking-wider uppercase text-white/60 hover:text-white/80"
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

      {/* Reattempt Dialog */}
      <Dialog open={!!reattemptDialogExamId} onOpenChange={(open) => { if (!open) setReattemptDialogExamId(null); }}>
        <DialogContent className="bg-[hsl(var(--dashboard-card))] border-[hsl(var(--dashboard-border))] text-white/95 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-white/95 flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-[hsl(var(--dashboard-gold))]" />
              Allow Reattempt
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Enter the email addresses of students you want to allow to retake this exam.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {reattemptEmails.map((email, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => {
                    const updated = [...reattemptEmails];
                    updated[idx] = e.target.value;
                    setReattemptEmails(updated);
                  }}
                  className="flex-1 bg-[hsl(var(--dashboard-bg))] border-[hsl(var(--dashboard-border))] text-white/90 placeholder:text-white/50 font-mono text-xs"
                />
                {reattemptEmails.length > 1 && (
                  <button
                    onClick={() => setReattemptEmails((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-white/40 hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setReattemptEmails((prev) => [...prev, ""])}
              className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-white/50 hover:text-[hsl(var(--dashboard-gold))] transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add another email
            </button>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setReattemptDialogExamId(null)}
              className="border-[hsl(var(--dashboard-border))] text-white/75"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveReattempts}
              disabled={savingReattempts}
              className="bg-[hsl(var(--dashboard-gold))] text-[hsl(var(--dashboard-bg))] font-bold hover:bg-[hsl(var(--dashboard-gold)/0.85)]"
            >
              {savingReattempts ? "Saving..." : "Grant Reattempt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default Submissions;
