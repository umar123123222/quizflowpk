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

interface FormFieldSettings {
  name_visible: boolean;
  name_required: boolean;
  email_visible: boolean;
  email_required: boolean;
  phone_visible: boolean;
  phone_required: boolean;
}

const buildStudentInfoSchema = (fs: FormFieldSettings | null) => {
  const shape: Record<string, z.ZodTypeAny> = {
    fullName: z.string().trim().min(1, "Full name is required").max(100, "Name too long"),
  };

  if (!fs || fs.email_visible) {
    if (!fs || fs.email_required) {
      shape.email = z.string().trim().email("Invalid email address").max(255);
    } else {
      shape.email = z.string().trim().email("Invalid email address").max(255).or(z.literal("")).optional();
    }
  } else {
    shape.email = z.string().optional();
  }

  if (!fs || fs.phone_visible) {
    if (!fs || fs.phone_required) {
      shape.phone = z.string().trim().min(7, "Phone number is too short").max(20, "Phone number is too long");
    } else {
      shape.phone = z.string().trim().max(20, "Phone number is too long").or(z.literal("")).optional();
    }
  } else {
    shape.phone = z.string().optional();
  }

  return z.object(shape);
};

type StudentInfo = { fullName: string; email?: string; phone?: string; customFields?: Record<string, string> };

interface CustomFieldDef {
  id: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  dropdown_options: string[];
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  order_index: number;
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  time_limit: number | null;
  organization_id: string | null;
}

const TakeExam = () => {
  const { code } = useParams<{ code: string }>();
  const { toast } = useToast();
  const [examId, setExamId] = useState<string | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [formSettings, setFormSettings] = useState<FormFieldSettings | null>(null);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [questionResults, setQuestionResults] = useState<Array<{
    question_text: string;
    question_type: string;
    student_answer: string | null;
    correct_answer: string | null;
    is_correct: boolean;
    option_a: string | null;
    option_b: string | null;
    option_c: string | null;
    option_d: string | null;
  }>>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasAutoSubmitted = useRef(false);
  const fullscreenExitCount = useRef(0);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [fsCountdown, setFsCountdown] = useState(5);
  const fsCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tabSwitchCount = useRef(0);
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false);
  const isSubmittingRef = useRef(false);
  const violationsRef = useRef<Array<{ type: string; timestamp: string }>>([]); 

  const addViolation = (type: string) => {
    violationsRef.current.push({
      type,
      timestamp: new Date().toISOString(),
    });
  };
  const studentInfoSchema = buildStudentInfoSchema(formSettings);
  const form = useForm<StudentInfo>({
    resolver: zodResolver(studentInfoSchema),
    defaultValues: { fullName: "", email: "", phone: "" },
  });

  // Fetch exam & questions by code
  useEffect(() => {
    if (!code) return;
    const fetchExam = async () => {
      setLoading(true);
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("id, title, description, time_limit, organization_id")
        .eq("code", code)
        .eq("is_published", true)
        .single();

      if (examError || !examData) {
        setError("Exam not found or is not published.");
        setLoading(false);
        return;
      }
      setExam(examData);
      setExamId(examData.id);

      // Fetch form settings for the org
      if (examData.organization_id) {
        const { data: fs } = await supabase
          .from("organization_form_settings")
          .select("*")
          .eq("organization_id", examData.organization_id)
          .single();
        if (fs) {
          setFormSettings({
            name_visible: fs.name_visible,
            name_required: fs.name_required,
            email_visible: fs.email_visible,
            email_required: fs.email_required,
            phone_visible: fs.phone_visible,
            phone_required: fs.phone_required,
          });
        }
        // Fetch custom fields
        const { data: cfData } = await supabase
          .from("organization_custom_fields")
          .select("*")
          .eq("organization_id", examData.organization_id)
          .order("sort_order", { ascending: true });
        if (cfData) {
          setCustomFieldDefs(
            cfData.map((cf: any) => ({
              id: cf.id,
              field_label: cf.field_label,
              field_type: cf.field_type,
              is_required: cf.is_required,
              dropdown_options: Array.isArray(cf.dropdown_options) ? cf.dropdown_options : [],
            }))
          );
        }
      }

      const { data: questionsData } = await supabase
        .from("questions")
        .select("id, question_text, question_type, option_a, option_b, option_c, option_d, order_index")
        .eq("exam_id", examData.id)
        .order("order_index", { ascending: true });

      const questionsWithType = (questionsData || []).map((q: any) => ({
        ...q,
        question_type: q.question_type || "mcq",
      }));

      setQuestions(questionsWithType);
      setLoading(false);
    };
    fetchExam();
  }, [code]);

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
    if (!studentInfo || !exam || !examId || submitting || submitted) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    // Exit fullscreen on submit
    if (document.fullscreenElement) {
      try { document.exitFullscreen(); } catch (e) {}
    }

    // Register student - generate ID client-side to avoid needing SELECT after insert
    const studentId = crypto.randomUUID();
    const studentInsert: any = {
      id: studentId,
      full_name: studentInfo.fullName,
    };
    if (studentInfo.email) studentInsert.email = studentInfo.email;
    if (studentInfo.phone) studentInsert.phone = studentInfo.phone;
    if (exam.organization_id) {
      studentInsert.organization_id = exam.organization_id;
    }

    const { error: studentError } = await supabase
      .from("students")
      .insert(studentInsert);

    if (studentError) {
      console.error("Student registration error:", studentError);
      toast({ title: "Error", description: `Failed to register student: ${studentError.message}`, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Calculate score & build results
    const { data: fullQuestions } = await supabase
      .from("questions")
        .select("id, question_text, question_type, option_a, option_b, option_c, option_d, correct_answer, order_index")
        .eq("exam_id", examId)
      .order("order_index", { ascending: true });

    const sorted = fullQuestions || [];
    let correct = 0;
    const mcqCount = sorted.filter((q: any) => (q as any).question_type !== "text").length;
    const results = sorted.map((q: any) => {
      const studentAnswer = answers[q.id] || null;
      const qType = q.question_type || "mcq";
      const isCorrect = qType === "mcq" ? studentAnswer === q.correct_answer : false;
      if (isCorrect) correct++;
      return {
        question_text: q.question_text,
        question_type: qType,
        student_answer: studentAnswer,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
      };
    });

    const total = mcqCount;
    const calculatedScore = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Submit
    const { error: subError } = await supabase.from("submissions").insert({
      exam_id: examId,
      student_id: studentId,
      answers: answers,
      score: calculatedScore,
      violations: violationsRef.current,
    });

    if (subError) {
      toast({ title: "Error", description: `Failed to submit exam: ${subError?.message || "Unknown error"}`, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    setScore(calculatedScore);
    setCorrectCount(correct);
    setTotalCount(total);
    setQuestionResults(results);
    setSubmitted(true);
    setSubmitting(false);
  }, [studentInfo, exam, examId, answers, submitting, submitted, toast]);

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

  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const onStudentSubmit = async (data: StudentInfo) => {
    // Check if student already submitted this exam (only if email provided)
    if (examId && data.email) {
      const { data: existingStudents } = await supabase
        .from("students")
        .select("id")
        .eq("email", data.email);

      if (existingStudents && existingStudents.length > 0) {
        const studentIds = existingStudents.map((s) => s.id);
        const { data: existingSubs } = await supabase
          .from("submissions")
          .select("id")
          .eq("exam_id", examId)
          .in("student_id", studentIds);

        if (existingSubs && existingSubs.length > 0) {
          setAlreadySubmitted(true);
          toast({
            title: "Already Submitted",
            description: "You have already attempted this exam. Only one attempt is allowed.",
            variant: "destructive",
          });
          return;
        }
      }
    }

    setStudentInfo(data);
    // Request fullscreen when exam starts
    try {
      document.documentElement.requestFullscreen?.();
    } catch (e) {
      // Fullscreen may not be supported in all contexts (e.g., iframes)
    }
  };

  // Anti-cheat: block right-click, copy, select, keyboard shortcuts
  useEffect(() => {
    if (!studentInfo || submitted) return;

    const blockContextMenu = (e: MouseEvent) => e.preventDefault();
    const blockCopy = (e: ClipboardEvent) => e.preventDefault();
    const blockSelect = (e: Event) => {
      if (window.getSelection) window.getSelection()?.removeAllRanges();
    };
    const blockKeys = (e: KeyboardEvent) => {
      if (e.key === "F12") { e.preventDefault(); return; }
      if (e.ctrlKey || e.metaKey) {
        const blocked = ["a", "c", "u", "s", "p"];
        if (blocked.includes(e.key.toLowerCase())) { e.preventDefault(); }
      }
    };

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("copy", blockCopy);
    document.addEventListener("selectstart", blockSelect);
    document.addEventListener("keydown", blockKeys);
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("copy", blockCopy);
      document.removeEventListener("selectstart", blockSelect);
      document.removeEventListener("keydown", blockKeys);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, [studentInfo, submitted]);

  useEffect(() => {
    if (!studentInfo || submitted) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isSubmittingRef.current && !hasAutoSubmitted.current) {
        fullscreenExitCount.current += 1;
        addViolation("Full-screen exited");
        setShowFullscreenWarning(true);
        setFsCountdown(5);

        // Clear any existing countdown
        if (fsCountdownRef.current) clearInterval(fsCountdownRef.current);

        let count = 5;
        fsCountdownRef.current = setInterval(() => {
          count -= 1;
          setFsCountdown(count);
          if (count <= 0) {
            if (fsCountdownRef.current) clearInterval(fsCountdownRef.current);
            fsCountdownRef.current = null;
            // Auto-submit due to violation
            if (!isSubmittingRef.current && !hasAutoSubmitted.current) {
              addViolation("Auto-submitted: full-screen exit timeout");
              isSubmittingRef.current = true;
              setShowFullscreenWarning(false);
              toast({ title: "Exam Auto-Submitted", description: "You did not return to full-screen in time. Your exam has been submitted.", variant: "destructive" });
              handleSubmitExam();
            }
          }
        }, 1000);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (fsCountdownRef.current) clearInterval(fsCountdownRef.current);
    };
  }, [studentInfo, submitted, handleSubmitExam, toast]);

  // Tab switch / visibility detection
  useEffect(() => {
    if (!studentInfo || submitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmittingRef.current && !hasAutoSubmitted.current) {
        tabSwitchCount.current += 1;
        addViolation("Tab switched");
        if (tabSwitchCount.current >= 2) {
          addViolation("Auto-submitted: repeated tab switching");
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
    // Cancel countdown
    if (fsCountdownRef.current) {
      clearInterval(fsCountdownRef.current);
      fsCountdownRef.current = null;
    }
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

  // Already submitted state
  if (alreadySubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Already Attempted</h2>
            <p className="text-muted-foreground">You have already submitted this exam. Only one attempt is allowed per student.</p>
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

  // Submitted — full-screen success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-primary" />
            </div>
            <h1 className="font-serif text-3xl font-bold">Exam Submitted Successfully</h1>
            <div className="space-y-2">
              <p className="text-muted-foreground text-lg">
                Thank you, <span className="font-semibold text-foreground">{studentInfo?.fullName}</span>
              </p>
              <p className="text-muted-foreground">
                Exam: <span className="font-semibold text-foreground">{exam?.title}</span>
              </p>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2">
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
            <p className="text-sm text-muted-foreground italic border border-border rounded-lg p-3 bg-muted/30">
              Your result will be reviewed by your instructor.
            </p>
            <Button
              variant={showResults ? "outline" : "default"}
              className="w-full"
              onClick={() => setShowResults(!showResults)}
            >
              {showResults ? "Hide Results" : "View Detailed Results"}
            </Button>
          </div>
        </div>

        {showResults && (
          <div className="max-w-3xl mx-auto w-full px-4 pb-8 space-y-4">
            <h3 className="font-serif text-lg font-semibold">Review Your Answers</h3>
            {questionResults.map((q, index) => {
              const isText = q.question_type === "text";
              return (
                <Card key={index} className={`overflow-hidden border-l-4 ${isText ? "border-l-muted" : q.is_correct ? "border-l-primary" : "border-l-destructive"}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {isText ? (
                        <span className="h-4 w-4 text-muted-foreground text-xs font-mono">✍</span>
                      ) : q.is_correct ? (
                        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <span className="text-primary font-bold">Q{index + 1}.</span>
                      {q.question_text}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {isText ? (
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-md border border-border text-sm">
                          <span className="text-muted-foreground text-xs font-medium block mb-1">Your Answer:</span>
                          <p className="text-foreground">{q.student_answer || <span className="italic text-muted-foreground">Not answered</span>}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Text answers will be reviewed by the teacher.</p>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
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
                {(!formSettings || formSettings.email_visible) && (
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email{formSettings && !formSettings.email_required ? " (Optional)" : ""}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="email" placeholder="Enter your email" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                {(!formSettings || formSettings.phone_visible) && (
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number{formSettings && !formSettings.phone_required ? " (Optional)" : ""}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="tel" placeholder="Enter your phone number" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
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
              {q.question_type === "text" ? (
                <textarea
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Type your answer here..."
                  rows={4}
                  className="w-full rounded-md border border-border bg-background text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              ) : (
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
              )}
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
              You have exited full-screen. Return to full-screen immediately or your exam will be auto-submitted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full border-4 border-destructive flex items-center justify-center">
                <span className="text-3xl font-bold text-destructive font-mono">{fsCountdown}</span>
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Return to full-screen in <span className="text-destructive font-bold">{fsCountdown}</span>...
              </p>
            </div>
          </div>
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
