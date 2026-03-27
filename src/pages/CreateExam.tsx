import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  LogOut,
  Link,
  Copy,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Question {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctAnswer: string; // "A" | "B" | "C" | "D"
}

const createEmptyQuestion = (): Question => ({
  id: crypto.randomUUID(),
  text: "",
  options: ["", "", "", ""],
  correctAnswer: "A",
});

const CreateExam = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState<number | "">(30);
  const [questions, setQuestions] = useState<Question[]>([createEmptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [savedExamId, setSavedExamId] = useState<string | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const examLink = savedExamId ? `${window.location.origin}/exam/${savedExamId}` : "";

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
    if (questions.some((q) => !q.text.trim() || q.options.some((o) => !o.trim()))) {
      toast({ title: "Incomplete questions", description: "Fill in all question texts and options.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Get org
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user!.id)
        .single();

      if (orgError || !org) throw new Error("Organization not found. Please create one first.");

      // Insert exam
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .insert({
          title: title.trim(),
          time_limit: timeLimit || null,
          organization_id: org.id,
          created_by: user!.id,
        })
        .select("id")
        .single();

      if (examError || !exam) throw examError || new Error("Failed to create exam");

      // Insert questions
      const questionRows = questions.map((q, i) => ({
        exam_id: exam.id,
        question_text: q.text.trim(),
        option_a: q.options[0].trim(),
        option_b: q.options[1].trim(),
        option_c: q.options[2].trim(),
        option_d: q.options[3].trim(),
        correct_answer: q.correctAnswer,
        order_index: i,
        options: q.options.map((o, idx) => ({
          label: String.fromCharCode(65 + idx),
          text: o.trim(),
        })),
      }));

      const { error: qError } = await supabase.from("questions").insert(questionRows);
      if (qError) throw qError;

      toast({ title: "Exam saved!", description: `"${title}" has been created successfully.` });
      setSavedExamId(exam.id);
      setShowLinkDialog(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const optionLabels = ["A", "B", "C", "D"];

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
                Org / Create Exam
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
                Create <span className="text-[hsl(var(--dashboard-gold))]">Exam</span>
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
                      <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-[hsl(var(--dashboard-gold))]">
                        Question {qIndex + 1}
                      </span>
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
                  </div>
                </div>
              ))}
            </div>

            {/* Add Question + Save */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={addQuestion}
                className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-[hsl(var(--dashboard-border))] px-5 py-3 font-mono text-[11px] tracking-wider uppercase text-white/30 transition-all hover:border-[hsl(var(--dashboard-gold))] hover:text-[hsl(var(--dashboard-gold))]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Question
              </button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--dashboard-gold))] px-6 py-3 font-mono text-[11px] tracking-wider uppercase text-[hsl(var(--dashboard-bg))] font-bold transition-all hover:bg-[hsl(var(--dashboard-gold)/0.85)] disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving..." : "Save Exam"}
              </Button>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CreateExam;
