import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, Save, GripVertical, Link, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctOption: number;
}

const createEmptyQuestion = (): Question => ({
  id: crypto.randomUUID(),
  text: "",
  options: ["", "", "", ""],
  correctOption: 0,
});

const ExamBuilder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [questions, setQuestions] = useState<Question[]>([createEmptyQuestion()]);
  const [saving, setSaving] = useState(false);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateQuestionText = (id: string, text: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, text } : q)));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.map((o, i) => (i === optionIndex ? value : o)) }
          : q
      )
    );
  };

  const updateCorrectOption = (questionId: string, optionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, correctOption: optionIndex } : q))
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Error", description: "Please enter an exam title.", variant: "destructive" });
      return;
    }
    if (!timeLimit || Number(timeLimit) <= 0) {
      toast({ title: "Error", description: "Please enter a valid time limit.", variant: "destructive" });
      return;
    }
    const emptyQ = questions.find((q) => !q.text.trim() || q.options.some((o) => !o.trim()));
    if (emptyQ) {
      toast({ title: "Error", description: "Please fill in all questions and options.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Get the user's organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user?.id)
        .maybeSingle();

      if (orgError || !org) {
        toast({ title: "Error", description: "No organization found. Please log out and back in.", variant: "destructive" });
        setSaving(false);
        return;
      }

      // Create the exam
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .insert({
          title: title.trim(),
          time_limit: Number(timeLimit),
          organization_id: org.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (examError) throw examError;

      // Insert all questions
      const questionsToInsert = questions.map((q, index) => ({
        exam_id: exam.id,
        question_text: q.text.trim(),
        options: q.options,
        correct_answer: q.correctOption,
        order_index: index,
      }));

      const { error: qError } = await supabase.from("questions").insert(questionsToInsert);
      if (qError) throw qError;

      toast({ title: "Success", description: "Exam saved successfully!" });
      setTitle("");
      setTimeLimit("");
      setQuestions([createEmptyQuestion()]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save exam.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create Exam</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Exam Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Exam Title</Label>
            <Input
              id="title"
              placeholder="e.g. Midterm Mathematics"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
            <Input
              id="timeLimit"
              type="number"
              min={1}
              placeholder="e.g. 60"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {questions.map((question, qIndex) => (
          <Card key={question.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Question {qIndex + 1}</CardTitle>
              </div>
              {questions.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeQuestion(question.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Question Text</Label>
                <Input
                  placeholder="Enter your question..."
                  value={question.text}
                  onChange={(e) => updateQuestionText(question.id, e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Options (select the correct answer)</Label>
                <RadioGroup
                  value={String(question.correctOption)}
                  onValueChange={(val) => updateCorrectOption(question.id, Number(val))}
                  className="space-y-2"
                >
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-3">
                      <RadioGroupItem value={String(oIndex)} id={`${question.id}-opt-${oIndex}`} />
                      <Input
                        className="flex-1"
                        placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                        value={option}
                        onChange={(e) => updateOption(question.id, oIndex, e.target.value)}
                      />
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between mt-6 mb-8">
        <Button variant="outline" onClick={addQuestion}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Exam"}
        </Button>
      </div>
    </div>
  );
};

export default ExamBuilder;
