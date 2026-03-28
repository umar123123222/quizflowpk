import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleSidebar } from "@/components/RoleSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  LogOut,
  Link,
  Copy,
  FileText,
  ListChecks,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type QuestionType = "mcq" | "text";

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: [string, string, string, string];
  correctAnswer: string;
}

const createEmptyQuestion = (type: QuestionType = "mcq"): Question => ({
  id: crypto.randomUUID(),
  type,
  text: "",
  options: ["", "", "", ""],
  correctAnswer: type === "mcq" ? "A" : "",
});

const CreateExam = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = Boolean(editId);

  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState<number | "">(30);
  const [resultVisibility, setResultVisibility] = useState<"immediate" | "after_exam_ends">("immediate");
  const [questions, setQuestions] = useState<Question[]>([createEmptyQuestion()]);
  const [startTime, setStartTime] = useState<Date | undefined>(undefined);
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [endTime, setEndTime] = useState<Date | undefined>(undefined);
  const [endHour, setEndHour] = useState("17");
  const [endMinute, setEndMinute] = useState("00");
  const [saving, setSaving] = useState(false);
  const [savedExamCode, setSavedExamCode] = useState<string | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [loadingExam, setLoadingExam] = useState(false);

  const examLink = savedExamCode ? `${window.location.origin}/exam/${savedExamCode}` : "";

  // Load existing exam data in edit mode
  useEffect(() => {
    if (!editId) return;
    const loadExam = async () => {
      setLoadingExam(true);
      try {
        const { data: exam } = await supabase
          .from("exams")
          .select("*")
          .eq("id", editId)
          .single();
        if (exam) {
          setTitle(exam.title);
          setTimeLimit(exam.time_limit ?? 30);
          setResultVisibility((exam as any).result_visibility || "immediate");
          if (exam.code) setSavedExamCode(exam.code);
        }
        const { data: qs } = await supabase
          .from("questions")
          .select("*")
          .eq("exam_id", editId)
          .order("order_index", { ascending: true });
        if (qs && qs.length > 0) {
          setQuestions(
            qs.map((q) => ({
              id: q.id,
              type: ((q as any).question_type || "mcq") as QuestionType,
              text: q.question_text,
              options: [q.option_a || "", q.option_b || "", q.option_c || "", q.option_d || ""] as [string, string, string, string],
              correctAnswer: q.correct_answer || "",
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load exam", err);
      } finally {
        setLoadingExam(false);
      }
    };
    loadExam();
  }, [editId]);

  // Owners cannot create exams — redirect to dashboard
  if (role === "organization_owner") {
    return <Navigate to="/dashboard/owner" replace />;
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(examLink);
    toast({ title: "Link copied!", description: "Shareable exam link copied to clipboard." });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const opts = [...updated[qIndex].options] as [string, string, string, string];
      opts[oIndex] = value;
      updated[qIndex] = { ...updated[qIndex], options: opts };
      return updated;
    });
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please enter an exam title.", variant: "destructive" });
      return;
    }
    const hasIncomplete = questions.some((q) => {
      if (!q.text.trim()) return true;
      if (q.type === "mcq" && q.options.some((o) => !o.trim())) return true;
      return false;
    });
    if (hasIncomplete) {
      toast({ title: "Incomplete questions", description: "Fill in all question texts and options.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Try to get org (optional for teachers)
      let orgId: string | null = null;
      const { data: orgOwner } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (orgOwner) {
        orgId = orgOwner.id;
      } else {
        // Check if teacher belongs to an org
        const { data: membership } = await supabase
          .from("organization_teachers")
          .select("organization_id")
          .eq("teacher_id", user!.id)
          .maybeSingle();
        if (membership) {
          orgId = membership.organization_id;
        }
      }

      let examId = editId;

      if (isEditMode && editId) {
        // Update existing exam
        const { error: examError } = await supabase
          .from("exams")
          .update({ title: title.trim(), time_limit: timeLimit || null, result_visibility: resultVisibility })
          .eq("id", editId);
        if (examError) throw examError;

        // Delete old questions and re-insert
        await supabase.from("questions").delete().eq("exam_id", editId);
      } else {
        // Insert new exam
        const insertData: any = {
            title: title.trim(),
            time_limit: timeLimit || null,
            result_visibility: resultVisibility,
            created_by: user!.id,
            is_published: true,
          };
        if (orgId) insertData.organization_id = orgId;

        const { data: exam, error: examError } = await supabase
          .from("exams")
          .insert(insertData)
          .select("id, code")
          .single();

        if (examError || !exam) throw examError || new Error("Failed to create exam");
        examId = exam.id;
        setSavedExamCode(exam.code);
      }

      // Insert questions
      const questionRows = questions.map((q, i) => ({
        exam_id: examId!,
        question_type: q.type,
        question_text: q.text.trim(),
        option_a: q.type === "mcq" ? q.options[0].trim() : null,
        option_b: q.type === "mcq" ? q.options[1].trim() : null,
        option_c: q.type === "mcq" ? q.options[2].trim() : null,
        option_d: q.type === "mcq" ? q.options[3].trim() : null,
        correct_answer: q.type === "mcq" ? q.correctAnswer : (q.correctAnswer.trim() || null),
        order_index: i,
        options: q.type === "mcq"
          ? q.options.map((o, idx) => ({
              label: String.fromCharCode(65 + idx),
              text: o.trim(),
            }))
          : [],
      }));

      const { error: qError } = await supabase.from("questions").insert(questionRows);
      if (qError) throw qError;

      toast({ title: isEditMode ? "Exam updated!" : "Exam saved!", description: `"${title}" has been ${isEditMode ? "updated" : "created"} successfully.` });
      setSavedExamCode(savedExamCode || "saved");
      setShowLinkDialog(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const optionLabels = ["A", "B", "C", "D"];

  if (loadingExam) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-[hsl(var(--dashboard-bg))]">
          <RoleSidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-[hsl(var(--dashboard-gold))] border-t-transparent rounded-full" />
          </div>
        </div>
      </SidebarProvider>
    );
  }

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
                Org / {isEditMode ? "Edit Exam" : "Create Exam"}
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
          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            {/* Back + Title */}
            <div className="mb-8">
              <button
                onClick={() => navigate("/dashboard/owner")}
                className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-white/30 hover:text-white/60 transition-colors mb-4"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Dashboard
              </button>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-white/90">
                {isEditMode ? "Edit" : "Create"} <span className="text-[hsl(var(--dashboard-gold))]">Exam</span>
              </h1>
            </div>

            {/* Exam Details */}
            <div className="grid gap-4 sm:grid-cols-2 mb-8">
              <div className="space-y-2">
                <label className="font-mono text-[10px] tracking-[0.15em] uppercase text-white/35">
                  Exam Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm Mathematics"
                  className="bg-[hsl(var(--dashboard-card))] border-[hsl(var(--dashboard-border))] text-white/80 placeholder:text-white/20 focus-visible:ring-[hsl(var(--dashboard-gold)/0.4)]"
                />
              </div>
              <div className="space-y-2">
                <label className="font-mono text-[10px] tracking-[0.15em] uppercase text-white/35">
                  Time Limit (minutes)
                </label>
                <Input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value ? Number(e.target.value) : "")}
                  placeholder="30"
                  min={1}
                  className="bg-[hsl(var(--dashboard-card))] border-[hsl(var(--dashboard-border))] text-white/80 placeholder:text-white/20 focus-visible:ring-[hsl(var(--dashboard-gold)/0.4)]"
                />
              </div>
            </div>

            {/* Result Visibility */}
            <div className="mb-8 space-y-3">
              <label className="font-mono text-[10px] tracking-[0.15em] uppercase text-white/35 flex items-center gap-2">
                <Eye className="h-3.5 w-3.5" />
                Result Visibility
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setResultVisibility("immediate")}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    resultVisibility === "immediate"
                      ? "border-[hsl(var(--dashboard-gold))] bg-[hsl(var(--dashboard-gold)/0.08)]"
                      : "border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] hover:border-white/20"
                  }`}
                >
                  <p className={`font-mono text-[11px] tracking-wider font-bold ${
                    resultVisibility === "immediate" ? "text-[hsl(var(--dashboard-gold))]" : "text-white/60"
                  }`}>
                    Immediately after submission
                  </p>
                  <p className="font-mono text-[9px] text-white/30 mt-1">
                    Students see their score and answers right away
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setResultVisibility("after_exam_ends")}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    resultVisibility === "after_exam_ends"
                      ? "border-[hsl(var(--dashboard-gold))] bg-[hsl(var(--dashboard-gold)/0.08)]"
                      : "border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] hover:border-white/20"
                  }`}
                >
                  <p className={`font-mono text-[11px] tracking-wider font-bold ${
                    resultVisibility === "after_exam_ends" ? "text-[hsl(var(--dashboard-gold))]" : "text-white/60"
                  }`}>
                    After exam time window ends
                  </p>
                  <p className="font-mono text-[9px] text-white/30 mt-1">
                    Results hidden until the exam period is over
                  </p>
                </button>
              </div>
            </div>

            {/* Questions */}
            <div className="mb-4">
              <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-white/30 mb-4">
                Questions
              </p>
            </div>

            <div className="space-y-6 mb-8">
              {questions.map((q, qIndex) => (
                <div
                  key={q.id}
                  className="rounded-lg border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] overflow-hidden"
                >
                  <div className="h-[2px] bg-[hsl(var(--dashboard-gold))]" />
                  <div className="p-5">
                    {/* Question header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-[hsl(var(--dashboard-gold))]">
                          Question {qIndex + 1}
                        </span>
                        {/* Type toggle */}
                        <div className="flex rounded-md border border-[hsl(var(--dashboard-border))] overflow-hidden">
                          <button
                            onClick={() => updateQuestion(qIndex, "type", "mcq")}
                            className={`flex items-center gap-1 px-2.5 py-1 font-mono text-[9px] tracking-wider uppercase transition-colors ${
                              q.type === "mcq"
                                ? "bg-[hsl(var(--dashboard-gold))] text-[hsl(var(--dashboard-bg))] font-bold"
                                : "text-white/30 hover:text-white/50"
                            }`}
                          >
                            <ListChecks className="h-3 w-3" />
                            MCQ
                          </button>
                          <button
                            onClick={() => updateQuestion(qIndex, "type", "text")}
                            className={`flex items-center gap-1 px-2.5 py-1 font-mono text-[9px] tracking-wider uppercase transition-colors ${
                              q.type === "text"
                                ? "bg-[hsl(var(--dashboard-gold))] text-[hsl(var(--dashboard-bg))] font-bold"
                                : "text-white/30 hover:text-white/50"
                            }`}
                          >
                            <FileText className="h-3 w-3" />
                            Text
                          </button>
                        </div>
                      </div>
                      {questions.length > 1 && (
                        <button
                          onClick={() => removeQuestion(qIndex)}
                          className="flex items-center gap-1 font-mono text-[10px] tracking-wider uppercase text-white/20 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Question text */}
                    <Input
                      value={q.text}
                      onChange={(e) => updateQuestion(qIndex, "text", e.target.value)}
                      placeholder="Enter your question..."
                      className="mb-4 bg-[hsl(var(--dashboard-bg))] border-[hsl(var(--dashboard-border))] text-white/80 placeholder:text-white/20 focus-visible:ring-[hsl(var(--dashboard-gold)/0.4)]"
                    />

                    {q.type === "mcq" ? (
                      <>
                        {/* Options with radio */}
                        <RadioGroup
                          value={q.correctAnswer}
                          onValueChange={(val) => updateQuestion(qIndex, "correctAnswer", val)}
                          className="space-y-3"
                        >
                          {q.options.map((opt, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-3">
                              <RadioGroupItem
                                value={optionLabels[oIndex]}
                                id={`q${qIndex}-opt${oIndex}`}
                                className="border-white/20 text-[hsl(var(--dashboard-gold))] data-[state=checked]:border-[hsl(var(--dashboard-gold))]"
                              />
                              <Label
                                htmlFor={`q${qIndex}-opt${oIndex}`}
                                className="font-mono text-[11px] font-bold text-white/40 w-4 shrink-0"
                              >
                                {optionLabels[oIndex]}
                              </Label>
                              <Input
                                value={opt}
                                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                placeholder={`Option ${optionLabels[oIndex]}`}
                                className="flex-1 bg-[hsl(var(--dashboard-bg))] border-[hsl(var(--dashboard-border))] text-white/80 placeholder:text-white/20 text-sm focus-visible:ring-[hsl(var(--dashboard-gold)/0.4)]"
                              />
                            </div>
                          ))}
                        </RadioGroup>
                        <p className="font-mono text-[9px] text-white/20 mt-3">
                          Select the radio button next to the correct answer
                        </p>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <label className="font-mono text-[10px] tracking-[0.15em] uppercase text-white/35">
                          Model Answer (optional)
                        </label>
                        <textarea
                          value={q.correctAnswer}
                          onChange={(e) => updateQuestion(qIndex, "correctAnswer", e.target.value)}
                          placeholder="Enter the expected answer for reference..."
                          rows={3}
                          className="w-full rounded-md bg-[hsl(var(--dashboard-bg))] border border-[hsl(var(--dashboard-border))] text-white/80 placeholder:text-white/20 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--dashboard-gold)/0.4)]"
                        />
                        <p className="font-mono text-[9px] text-white/20">
                          Students will type their answer in a text field
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Question + Save */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setQuestions((prev) => [...prev, createEmptyQuestion("mcq")])}
                className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-[hsl(var(--dashboard-border))] px-5 py-3 font-mono text-[11px] tracking-wider uppercase text-white/30 transition-all hover:border-[hsl(var(--dashboard-gold))] hover:text-[hsl(var(--dashboard-gold))]"
              >
                <ListChecks className="h-3.5 w-3.5" />
                Add MCQ
              </button>
              <button
                onClick={() => setQuestions((prev) => [...prev, createEmptyQuestion("text")])}
                className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-[hsl(var(--dashboard-border))] px-5 py-3 font-mono text-[11px] tracking-wider uppercase text-white/30 transition-all hover:border-[hsl(var(--dashboard-gold))] hover:text-[hsl(var(--dashboard-gold))]"
              >
                <FileText className="h-3.5 w-3.5" />
                Add Text Question
              </button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--dashboard-gold))] px-6 py-3 font-mono text-[11px] tracking-wider uppercase text-[hsl(var(--dashboard-bg))] font-bold transition-all hover:bg-[hsl(var(--dashboard-gold)/0.85)] disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving..." : isEditMode ? "Update Exam" : "Save Exam"}
              </Button>
            </div>
          </main>
        </div>
      </div>

      {/* Shareable Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="bg-[hsl(var(--dashboard-card))] border-[hsl(var(--dashboard-border))] text-white/90">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-white/90 flex items-center gap-2">
              <Link className="h-5 w-5 text-[hsl(var(--dashboard-gold))]" />
              Exam Created!
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Share this link with students to take the exam.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-2">
            <input
              readOnly
              value={examLink}
              className="flex-1 rounded-md border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-bg))] px-3 py-2 font-mono text-xs text-white/70 outline-none"
            />
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 rounded-md border border-[hsl(var(--dashboard-gold))] bg-[hsl(var(--dashboard-gold)/0.1)] px-3 py-2 font-mono text-[10px] tracking-wider uppercase text-[hsl(var(--dashboard-gold))] transition-colors hover:bg-[hsl(var(--dashboard-gold)/0.2)]"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => navigate("/dashboard/owner/exams")}
              className="rounded-md bg-[hsl(var(--dashboard-gold))] px-4 py-2 font-mono text-[11px] tracking-wider uppercase text-[hsl(var(--dashboard-bg))] font-bold transition-colors hover:bg-[hsl(var(--dashboard-gold)/0.85)]"
            >
              Go to Exams
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default CreateExam;
