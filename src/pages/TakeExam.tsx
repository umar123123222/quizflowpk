import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Mail, Phone, Clock, CheckCircle, AlertTriangle, Maximize } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const studentInfoSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Name too long"),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().min(7, "Phone number is too short").max(20, "Phone number is too long"),
});

type StudentInfo = z.infer<typeof studentInfoSchema>;

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  order_index: number;
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  time_limit: number | null;
  organization_id: string;
}

const TakeExam = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [questionResults, setQuestionResults] = useState<Array<{
    question_text: string;
    student_answer: string | null;
    correct_answer: string;
    is_correct: boolean;
    option_a: string;
    option_b: string;
    option_c: string | null;
    option_d: string | null;
  }>>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasAutoSubmitted = useRef(false);
  const fullscreenExitCount = useRef(0);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const tabSwitchCount = useRef(0);
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false);
  const isSubmittingRef = useRef(false);
  const form = useForm<StudentInfo>({
    resolver: zodResolver(studentInfoSchema),
    defaultValues: { fullName: "", email: "", phone: "" },
  });

  // Fetch exam & questions
  useEffect(() => {
    if (!id) return;
    const fetchExam = async () => {
      setLoading(true);
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("id, title, description, time_limit, organization_id")
        .eq("id", id)
        .eq("is_published", true)
        .single();

      if (examError || !examData) {
        setError("Exam not found or is not published.");
        setLoading(false);
        return;
      }
      setExam(examData);

      const { data: questionsData } = await supabase
        .from("questions")
        .select("id, question_text, option_a, option_b, option_c, option_d, order_index")
        .eq("exam_id", id)
        .order("order_index", { ascending: true });

      setQuestions(questionsData || []);
      setLoading(false);
    };
    fetchExam();
  }, [id]);

  // Start timer when student submits info
  useEffect(() => {
    if (!studentInfo || !exam?.time_limit) return;
    setTimeLeft(exam.time_limit * 60);
  }, [studentInfo, exam]);

  // Countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitted) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, submitted]);

  const handleSubmitExam = useCallback(async () => {
    if (!studentInfo || !exam || !id || submitting || submitted) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    // Exit fullscreen on submit
    if (document.fullscreenElement) {
      try { document.exitFullscreen(); } catch (e) {}
    }

    // Register student
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .insert({
        full_name: studentInfo.fullName,
        email: studentInfo.email,
        phone: studentInfo.phone,
        organization_id: exam.organization_id,
        created_by: "00000000-0000-0000-0000-000000000000",
      })
      .select("id")
      .single();

    if (studentError || !studentData) {
      toast({ title: "Error", description: "Failed to register student.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Calculate score & build results
    const { data: fullQuestions } = await supabase
      .from("questions")
      .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_index")
      .eq("exam_id", id)
      .order("order_index", { ascending: true });

    const sorted = fullQuestions || [];
    let correct = 0;
    const results = sorted.map((q) => {
      const studentAnswer = answers[q.id] || null;
      const isCorrect = studentAnswer === q.correct_answer;
      if (isCorrect) correct++;
      return {
        question_text: q.question_text,
        student_answer: studentAnswer,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
      };
    });

    const total = sorted.length;
    const calculatedScore = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Submit
    const { error: subError } = await supabase.from("submissions").insert({
      exam_id: id,
      student_id: studentData.id,
      answers: answers,
      score: calculatedScore,
    });

    if (subError) {
      toast({ title: "Error", description: "Failed to submit exam.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    setScore(calculatedScore);
    setCorrectCount(correct);
    setTotalCount(total);
    setQuestionResults(results);
    setSubmitted(true);
    setSubmitting(false);
  }, [studentInfo, exam, id, answers, submitting, submitted, toast]);

  // Auto-submit when timer hits zero
  useEffect(() => {
    if (timeLeft === 0 && !submitted && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      toast({ title: "Time's up!", description: "Your exam has been auto-submitted." });
      handleSubmitExam();
    }
  }, [timeLeft, submitted, handleSubmitExam, toast]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const onStudentSubmit = (data: StudentInfo) => {
    setStudentInfo(data);
    // Request fullscreen when exam starts
    try {
      document.documentElement.requestFullscreen?.();
    } catch (e) {
      // Fullscreen may not be supported in all contexts (e.g., iframes)
    }
  };

  // Fullscreen exit detection
  useEffect(() => {
    if (!studentInfo || submitted) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isSubmittingRef.current && !hasAutoSubmitted.current) {
        fullscreenExitCount.current += 1;
        if (fullscreenExitCount.current >= 2) {
          // Second exit — auto-submit immediately
          isSubmittingRef.current = true;
          toast({ title: "Exam Auto-Submitted", description: "You exited full-screen a second time. Your exam has been submitted.", variant: "destructive" });
          handleSubmitExam();
        } else {
          // First exit — show warning
          setShowFullscreenWarning(true);
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [studentInfo, submitted, handleSubmitExam, toast]);

  // Tab switch / visibility detection
  useEffect(() => {
    if (!studentInfo || submitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmittingRef.current && !hasAutoSubmitted.current) {
        tabSwitchCount.current += 1;
        if (tabSwitchCount.current >= 2) {
          isSubmittingRef.current = true;
          toast({ title: "Exam Auto-Submitted", description: "Your exam was submitted due to repeated tab switching.", variant: "destructive" });
          handleSubmitExam();
        } else {
          setShowTabSwitchWarning(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [studentInfo, submitted, handleSubmitExam, toast]);

  const handleReEnterFullscreen = () => {
    setShowFullscreenWarning(false);
    try {
      document.documentElement.requestFullscreen?.();
    } catch (e) {
      // ignore
    }
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">{error}</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground animate-pulse">Loading exam...</p>
      </div>
    );
  }

  // Submitted — detailed results
  if (submitted) {
    const getOptionText = (q: typeof questionResults[0], key: string) => {
      if (key === "A") return q.option_a;
      if (key === "B") return q.option_b;
      if (key === "C") return q.option_c || "";
      if (key === "D") return q.option_d || "";
      return "";
    };

    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Score header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-3xl mx-auto px-4 py-8 text-center space-y-3">
            <CheckCircle className="h-14 w-14 text-primary mx-auto" />
            <h2 className="font-serif text-2xl font-bold">Exam Submitted!</h2>
            <p className="text-muted-foreground">
              Thank you, <span className="font-semibold text-foreground">{studentInfo?.fullName}</span>.
            </p>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{correctCount}/{totalCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Correct Answers</p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{score}%</div>
                <p className="text-xs text-muted-foreground mt-1">Score</p>
              </div>
            </div>
          </div>
        </div>

        {/* Question-by-question results */}
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <h3 className="font-serif text-lg font-semibold">Review Your Answers</h3>
          {questionResults.map((q, index) => (
            <Card key={index} className={`overflow-hidden border-l-4 ${q.is_correct ? "border-l-primary" : "border-l-destructive"}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {q.is_correct ? (
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  <span className="text-primary font-bold">Q{index + 1}.</span>
                  {q.question_text}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {[
                  { key: "A", value: q.option_a },
                  { key: "B", value: q.option_b },
                  { key: "C", value: q.option_c },
                  { key: "D", value: q.option_d },
                ]
                  .filter((opt) => opt.value)
                  .map((opt) => {
                    const isStudentAnswer = q.student_answer === opt.key;
                    const isCorrectAnswer = q.correct_answer === opt.key;
                    let classes = "p-2.5 rounded-md border text-sm flex items-center gap-2";
                    if (isCorrectAnswer) {
                      classes += " border-primary bg-primary/10 text-foreground";
                    } else if (isStudentAnswer && !q.is_correct) {
                      classes += " border-destructive bg-destructive/10 text-foreground";
                    } else {
                      classes += " border-border text-muted-foreground";
                    }
                    return (
                      <div key={opt.key} className={classes}>
                        <span className="font-semibold">{opt.key}.</span>
                        <span className="flex-1">{opt.value}</span>
                        {isCorrectAnswer && <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />}
                        {isStudentAnswer && !q.is_correct && <span className="text-xs text-destructive font-medium">Your answer</span>}
                      </div>
                    );
                  })}
                {!q.student_answer && (
                  <p className="text-xs text-muted-foreground italic">Not answered</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Student info form
  if (!studentInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="font-serif text-2xl">{exam?.title || "Exam"}</CardTitle>
            <CardDescription>
              {exam?.description || "Please enter your details to start the exam"}
              {exam?.time_limit && (
                <span className="block mt-2 text-primary font-medium">
                  ⏱ Time Limit: {exam.time_limit} minute{exam.time_limit !== 1 ? "s" : ""}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onStudentSubmit)} className="space-y-4">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Enter your full name" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="email" placeholder="Enter your email" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="tel" placeholder="Enter your phone number" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full mt-2">Start Exam</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exam questions
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky timer bar */}
      <div className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-serif text-lg font-bold truncate">{exam?.title}</h1>
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 font-mono text-lg font-bold ${timeLeft <= 60 ? "text-destructive animate-pulse" : "text-primary"}`}>
              <Clock className="h-5 w-5" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </div>

      {/* Questions */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {questions.map((q, index) => (
          <Card key={q.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                <span className="text-primary font-bold mr-2">Q{index + 1}.</span>
                {q.question_text}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[q.id] || ""}
                onValueChange={(val) => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
                className="space-y-2"
              >
                {[
                  { key: "A", value: q.option_a },
                  { key: "B", value: q.option_b },
                  { key: "C", value: q.option_c },
                  { key: "D", value: q.option_d },
                ]
                  .filter((opt) => opt.value)
                  .map((opt) => (
                    <div key={opt.key} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                      <RadioGroupItem value={opt.key} id={`${q.id}-${opt.key}`} />
                      <Label htmlFor={`${q.id}-${opt.key}`} className="cursor-pointer flex-1 text-sm">
                        <span className="font-semibold text-primary mr-2">{opt.key}.</span>
                        {opt.value}
                      </Label>
                    </div>
                  ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ))}

        {/* Submit button */}
        <div className="pb-8">
          <Button
            onClick={handleSubmitExam}
            disabled={submitting}
            size="lg"
            className="w-full text-lg py-6"
          >
            {submitting ? "Submitting..." : "Submit Exam"}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            {Object.keys(answers).length} of {questions.length} questions answered
          </p>
        </div>
      </div>

      {/* Fullscreen Warning Dialog */}
      <Dialog open={showFullscreenWarning} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Full-Screen Exited!
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              You have exited full-screen. Please return to full-screen immediately or your exam will be submitted.
              <span className="block mt-2 font-semibold text-destructive">There will be no second chance.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleReEnterFullscreen} className="w-full gap-2">
              <Maximize className="h-4 w-4" />
              Return to Full-Screen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tab Switch Warning Dialog */}
      <Dialog open={showTabSwitchWarning} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Warning: Tab Switch Detected!
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              You switched tabs. This has been recorded.
              <span className="block mt-2 font-semibold text-destructive">If you switch tabs again, your exam will be auto-submitted immediately.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowTabSwitchWarning(false)} className="w-full">
              I Understand, Continue Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TakeExam;
