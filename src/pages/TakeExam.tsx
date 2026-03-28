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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Mail, Phone, Clock, CheckCircle, AlertTriangle, Maximize, CalendarClock, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FormFieldSettings {
  name_visible: boolean;
  name_required: boolean;
  email_visible: boolean;
  email_required: boolean;
  phone_visible: boolean;
  phone_required: boolean;
  field_order: string[];
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
  result_visibility: string;
  start_time: string | null;
  end_time: string | null;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
}

// Maps shuffled display key -> original key, per question
type OptionShuffleMap = Record<string, Record<string, string>>;

// Seeded PRNG (mulberry32)
function seededRandom(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  const rng = seededRandom(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getOrCreateSessionSeed(examId: string): number {
  const key = `exam_shuffle_seed_${examId}`;
  const existing = sessionStorage.getItem(key);
  if (existing) return parseInt(existing, 10);
  const seed = Math.floor(Math.random() * 2147483647);
  sessionStorage.setItem(key, seed.toString());
  return seed;
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
  const [optionShuffleMap, setOptionShuffleMap] = useState<OptionShuffleMap>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [questionResults, setQuestionResults] = useState<Array<{
    id: string;
    question_text: string;
    question_type: string;
    student_answer: string | null;
    correct_answer: string | null;
    is_correct: boolean;
    option_a: string | null;
    option_b: string | null;
    option_c: string | null;
    option_d: string | null;
    points: number;
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
        .select("id, title, description, time_limit, organization_id, result_visibility, start_time, end_time, shuffle_questions, shuffle_options")
        .eq("code", code)
        .eq("is_published", true)
        .single();

      if (examError || !examData) {
        setError("Exam not found or is not published.");
        setLoading(false);
        return;
      }

      // Check schedule window
      const now = new Date();
      if ((examData as any).start_time && new Date((examData as any).start_time) > now) {
        const startDate = new Date((examData as any).start_time);
        setError(`This exam hasn't started yet. It begins on ${format(startDate, "PPP")} at ${format(startDate, "p")}.`);
        setLoading(false);
        return;
      }
      if ((examData as any).end_time && new Date((examData as any).end_time) < now) {
        setError("This exam has ended and is no longer accepting submissions.");
        setLoading(false);
        return;
      }

      setExam(examData as any);
      setExamId(examData.id);

      // Fetch form settings for the org
      if (examData.organization_id) {
        const { data: fs } = await supabase
          .from("organization_form_settings")
          .select("*")
          .eq("organization_id", examData.organization_id)
          .single();
        if (fs) {
          const savedOrder = Array.isArray(fs.field_order)
            ? (fs.field_order as string[])
            : ["name", "email", "phone"];
          setFormSettings({
            name_visible: fs.name_visible,
            name_required: fs.name_required,
            email_visible: fs.email_visible,
            email_required: fs.email_required,
            phone_visible: fs.phone_visible,
            phone_required: fs.phone_required,
            field_order: savedOrder,
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

      const seed = getOrCreateSessionSeed(examData.id);

      // Apply seeded question shuffle if enabled
      const orderedQuestions = (examData as any).shuffle_questions
        ? seededShuffle(questionsWithType, seed)
        : questionsWithType;

      // Build option shuffle map if enabled
      if ((examData as any).shuffle_options) {
        const map: OptionShuffleMap = {};
        const labels = ["A", "B", "C", "D"];
        orderedQuestions.forEach((q: any, idx: number) => {
          if (q.question_type === "mcq") {
            const originalOptions = labels.filter((k) => q[`option_${k.toLowerCase()}`]);
            // Use a unique seed per question (base seed + question index)
            const shuffled = seededShuffle(originalOptions, seed + idx + 1);
            const qMap: Record<string, string> = {};
            shuffled.forEach((origKey, i) => {
              qMap[labels[i]] = origKey; // displayKey -> originalKey
            });
            map[q.id] = qMap;
          }
        });
        setOptionShuffleMap(map);
      }

      setQuestions(orderedQuestions);
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
        .select("id, question_text, question_type, option_a, option_b, option_c, option_d, correct_answer, order_index, points")
        .eq("exam_id", examId)
      .order("order_index", { ascending: true });

    const sorted = fullQuestions || [];
    // Translate shuffled answers back to original keys
    const translatedAnswers: Record<string, string> = {};
    for (const [qId, displayKey] of Object.entries(answers)) {
      if (optionShuffleMap[qId] && displayKey) {
        translatedAnswers[qId] = optionShuffleMap[qId][displayKey] || displayKey;
      } else {
        translatedAnswers[qId] = displayKey;
      }
    }
    let mcqEarnedPoints = 0;
    let mcqTotalPoints = 0;
    const results = sorted.map((q: any) => {
      const studentAnswer = translatedAnswers[q.id] || null;
      const qType = q.question_type || "mcq";
      const qPoints = q.points ?? 1;
      const isCorrect = qType === "mcq" ? studentAnswer === q.correct_answer : false;
      if (qType !== "text") {
        mcqTotalPoints += qPoints;
        if (isCorrect) mcqEarnedPoints += qPoints;
      }
      return {
        id: q.id,
        question_text: q.question_text,
        question_type: qType,
        student_answer: studentAnswer,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        points: qPoints,
      };
    });

    const totalPoints = sorted.reduce((sum: number, q: any) => sum + (q.points ?? 1), 0);
    const hasTextQs = sorted.some((q: any) => q.question_type === "text");
    // For mixed exams, score is based on MCQ only (text graded later); for MCQ-only, full score
    const calculatedScore = hasTextQs
      ? (totalPoints > 0 ? Math.round((mcqEarnedPoints / totalPoints) * 100) : 0)
      : (totalPoints > 0 ? Math.round((mcqEarnedPoints / totalPoints) * 100) : 0);

    // Submit — include custom fields and use translated answers
    const submissionAnswers: Record<string, any> = { ...translatedAnswers };
    if (studentInfo.customFields && Object.keys(studentInfo.customFields).length > 0) {
      submissionAnswers._customFields = studentInfo.customFields;
    }

    const { error: subError } = await supabase.from("submissions").insert({
      exam_id: examId,
      student_id: studentId,
      answers: submissionAnswers,
      score: calculatedScore,
      violations: violationsRef.current,
    });

    if (subError) {
      toast({ title: "Error", description: `Failed to submit exam: ${subError?.message || "Unknown error"}`, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    setScore(calculatedScore);
    setCorrectCount(mcqEarnedPoints);
    setTotalCount(mcqTotalPoints);
    // Reorder results to match the shuffled question order the student saw
    const questionOrder = questions.map((q) => q.id);
    const orderedResults = [...results].sort((a, b) => {
      const ai = questionOrder.indexOf(a.id);
      const bi = questionOrder.indexOf(b.id);
      return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi);
    });
    setQuestionResults(orderedResults);
    setSubmitted(true);
    setSubmitting(false);
  }, [studentInfo, exam, examId, answers, optionShuffleMap, submitting, submitted, toast]);

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
  const [prevSubmission, setPrevSubmission] = useState<{
    score: number | null;
    submitted_at: string | null;
    totalPoints: number;
    earnedPoints: number;
    isReviewed: boolean;
    hasTextQuestions: boolean;
    canReview: boolean;
    questions: Array<{
      id: string;
      question_text: string;
      question_type: string;
      student_answer: string | null;
      correct_answer: string | null;
      is_correct: boolean;
      option_a: string | null;
      option_b: string | null;
      option_c: string | null;
      option_d: string | null;
      points: number;
    }>;
  } | null>(null);
  const [showPrevReview, setShowPrevReview] = useState(false);
  const [reattemptGranted, setReattemptGranted] = useState(false);
  const [reattemptId, setReattemptId] = useState<string | null>(null);
  const [pendingStudentData, setPendingStudentData] = useState<StudentInfo | null>(null);

  const onStudentSubmit = async (data: StudentInfo) => {
    // Validate custom required fields
    for (const cf of customFieldDefs) {
      if (cf.is_required && !customFieldValues[cf.id]?.trim()) {
        toast({
          title: "Required Field",
          description: `Please fill in "${cf.field_label}"`,
          variant: "destructive",
        });
        return;
      }
    }

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
          // Fetch previous submission details first (needed for both paths)
          const subId = existingSubs[0].id;
          const [subRes, examRes2] = await Promise.all([
            supabase.from("submissions").select("score, submitted_at, answers, exam_id").eq("id", subId).single(),
            supabase.from("exams").select("result_visibility, end_time").eq("id", examId).single(),
          ]);
          const subDetail = subRes.data;
          const examInfo = examRes2.data;

          let prevSubData: typeof prevSubmission = null;
          if (subDetail) {
            const answersObj = (subDetail.answers as Record<string, any>) || {};
            const isReviewed = answersObj._reviewed === true;
            const visibility = (examInfo as any)?.result_visibility || "immediate";
            const examEnded = (examInfo as any)?.end_time ? new Date((examInfo as any).end_time) < new Date() : true;
            let canReview = visibility === "immediate" || (visibility === "after_exam_ends" && examEnded);

            const { data: fullQs } = await supabase
              .from("questions")
              .select("id, question_text, question_type, option_a, option_b, option_c, option_d, correct_answer, order_index, points")
              .eq("exam_id", subDetail.exam_id)
              .order("order_index", { ascending: true });

            const allQs = fullQs || [];
            const hasTextQuestions = allQs.some((q: any) => q.question_type === "text");
            const totalPoints = allQs.reduce((s: number, q: any) => s + (q.points ?? 1), 0);
            if (hasTextQuestions && !isReviewed) canReview = false;

            let mcqEarned = 0;
            const textScores = answersObj._textScores as Record<string, number> | undefined;
            let textEarned = 0;
            const questionResults = allQs.map((q: any) => {
              const studentAnswer = answersObj[q.id] || null;
              const qType = q.question_type || "mcq";
              const qPoints = q.points ?? 1;
              const isCorrect = qType === "mcq" ? studentAnswer === q.correct_answer : false;
              if (qType !== "text") {
                if (isCorrect) mcqEarned += qPoints;
              } else if (textScores && textScores[q.id] !== undefined) {
                textEarned += textScores[q.id];
              }
              return {
                id: q.id, question_text: q.question_text, question_type: qType,
                student_answer: studentAnswer, correct_answer: q.correct_answer, is_correct: isCorrect,
                option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
                points: qPoints,
              };
            });
            const earnedPoints = mcqEarned + (isReviewed ? textEarned : 0);
            prevSubData = {
              score: subDetail.score, submitted_at: subDetail.submitted_at,
              totalPoints, earnedPoints, isReviewed, hasTextQuestions, canReview,
              questions: questionResults,
            };
          }

          // Check if student has been granted a reattempt
          const { data: reattempt } = await supabase
            .from("exam_reattempts" as any)
            .select("id")
            .eq("exam_id", examId)
            .eq("student_email", data.email.trim().toLowerCase())
            .eq("used", false)
            .maybeSingle();

          setPrevSubmission(prevSubData);

          if (reattempt) {
            // Show reattempt banner instead of auto-consuming
            setReattemptGranted(true);
            setReattemptId((reattempt as any).id);
            setPendingStudentData({ ...data, customFields: customFieldValues });
            return;
          } else {
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
    }

    setStudentInfo({ ...data, customFields: customFieldValues });
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

  // Reattempt granted state
  if (reattemptGranted && !alreadySubmitted) {
    const handleStartReattempt = async () => {
      if (!reattemptId || !pendingStudentData) return;
      // Mark reattempt as used
      await supabase
        .from("exam_reattempts" as any)
        .update({ used: true })
        .eq("id", reattemptId);
      // Start fresh attempt
      setReattemptGranted(false);
      setStudentInfo(pendingStudentData);
      try {
        document.documentElement.requestFullscreen?.();
      } catch (e) {}
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <div className="w-full max-w-md space-y-5">
          {/* Green reattempt banner */}
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-5 text-center space-y-3">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Reattempt Granted</h2>
            <p className="text-sm text-green-400">
              Your instructor has granted you permission to reattempt this exam.
            </p>
            <Button
              onClick={handleStartReattempt}
              className="mt-2 text-white font-semibold"
              style={{ backgroundColor: "#e09615" }}
            >
              Start Reattempt
            </Button>
          </div>

          {/* Previous attempt summary */}
          {prevSubmission && (
            <Card className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Previous Attempt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Score</span>
                  <span className="font-bold">{prevSubmission.earnedPoints} / {prevSubmission.totalPoints}</span>
                </div>
                {prevSubmission.score !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Percentage</span>
                    <span className="font-bold">{prevSubmission.score}%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Already submitted state
  if (alreadySubmitted) {
    const ps = prevSubmission;
    const pendingReview = ps?.hasTextQuestions && !ps?.isReviewed;
    const percentage = ps?.score ?? 0;
    const passed = percentage >= 50;

    const formatDateTime = (dateStr: string | null) => {
      if (!dateStr) return "—";
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
        " at " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <div className="w-full max-w-md space-y-5">
          {/* Top section */}
          <div className="text-center space-y-3">
            <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">You have already submitted this exam.</h2>
            <p className="text-muted-foreground text-sm">This exam does not allow multiple attempts.</p>
          </div>

          {/* Result summary card */}
          {ps && (
            <Card className="border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Your Result Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Score */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Score</span>
                  <span className="text-lg font-bold text-foreground">
                    {pendingReview ? (
                      <span className="text-yellow-500">Pending Review</span>
                    ) : (
                      `${ps.earnedPoints} / ${ps.totalPoints}`
                    )}
                  </span>
                </div>

                {/* Percentage */}
                {!pendingReview && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Percentage</span>
                    <span className={`text-lg font-bold ${passed ? "text-green-500" : "text-destructive"}`}>
                      {percentage}%
                    </span>
                  </div>
                )}

                {/* Submitted at */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Submitted</span>
                  <span className="text-sm font-medium text-foreground">{formatDateTime(ps.submitted_at)}</span>
                </div>

                {/* Divider + Badge */}
                <div className="pt-2 border-t border-border flex justify-center">
                  <Badge
                    className={`text-xs px-4 py-1.5 ${
                      pendingReview
                        ? "bg-yellow-500/15 text-yellow-500 border-yellow-500/30"
                        : passed
                        ? "bg-green-500/15 text-green-500 border-green-500/30"
                        : "bg-destructive/15 text-destructive border-destructive/30"
                    }`}
                  >
                    {pendingReview ? "Pending Review" : passed ? "Pass" : "Fail"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Answer review section */}
          {ps && (
            ps.canReview ? (
              <div className="space-y-4">
                <Button
                  variant={showPrevReview ? "outline" : "default"}
                  className="w-full"
                  onClick={() => setShowPrevReview(!showPrevReview)}
                >
                  {showPrevReview ? "Hide Answers" : "Review Your Answers"}
                </Button>
                {showPrevReview && (
                  <div className="space-y-3">
                    {ps.questions.map((q, index) => {
                      const isText = q.question_type === "text";
                      return (
                        <Card key={q.id} className={`overflow-hidden border-l-4 ${isText ? "border-l-muted" : q.is_correct ? "border-l-primary" : "border-l-destructive"}`}>
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
                              <div className="p-2.5 rounded-md border border-border text-sm">
                                <span className="text-muted-foreground text-xs font-medium block mb-1">Your Answer:</span>
                                <p className="text-foreground">{q.student_answer || <span className="italic text-muted-foreground">Not answered</span>}</p>
                              </div>
                            ) : (
                              <>
                                {[
                                  { key: "A", value: q.option_a },
                                  { key: "B", value: q.option_b },
                                  { key: "C", value: q.option_c },
                                  { key: "D", value: q.option_d },
                                ].filter((opt) => opt.value).map((opt) => {
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
            ) : (
              <p className="text-center text-sm text-muted-foreground">Answer review is not available for this exam.</p>
            )
          )}
        </div>
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
    const hasTextQuestions = questions.some((q) => q.question_type === "text");
    const resultsDeferred = exam?.result_visibility === "after_exam_ends";
    // Check if the exam end time has passed
    const canShowDeferredResults = resultsDeferred && exam?.end_time
      ? new Date(exam.end_time) < new Date()
      : false;

    const showScoreAndReview = !hasTextQuestions && (!resultsDeferred || canShowDeferredResults);

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

            {hasTextQuestions ? (
              <div className="space-y-4 mt-4">
                <div className="border border-border rounded-lg p-6 bg-muted/30">
                  <Clock className="h-10 w-10 text-primary mx-auto mb-4" />
                  <p className="text-foreground font-semibold text-lg">Submitted Successfully</p>
                  <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
                    Your exam has been submitted successfully. Your instructor is reviewing your responses and your result will be available soon.
                  </p>
                  <p className="text-muted-foreground/60 text-xs mt-4">
                    No score, pass/fail status, or answer review will be shown until your instructor publishes the result.
                  </p>
                </div>
              </div>
            ) : showScoreAndReview ? (
              <>
                {(() => {
                  const mcqQs = questionResults.filter(q => q.question_type !== "text");
                  const mcqEarned = mcqQs.reduce((s, q) => s + (q.is_correct ? (q.points ?? 1) : 0), 0);
                  const mcqTotal = mcqQs.reduce((s, q) => s + (q.points ?? 1), 0);
                  const grandTotal = questionResults.reduce((s, q) => s + (q.points ?? 1), 0);
                  return (
                    <div className="flex items-center justify-center gap-6 mt-2">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">{mcqEarned}/{mcqTotal}</div>
                        <p className="text-xs text-muted-foreground mt-1">MCQ Score</p>
                      </div>
                      <div className="w-px h-12 bg-border" />
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">{mcqEarned}/{grandTotal}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total Marks</p>
                      </div>
                      <div className="w-px h-12 bg-border" />
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">{score}%</div>
                        <p className="text-xs text-muted-foreground mt-1">Percentage</p>
                      </div>
                    </div>
                  );
                })()}
                <Button
                  variant={showResults ? "outline" : "default"}
                  className="w-full"
                  onClick={() => setShowResults(!showResults)}
                >
                  {showResults ? "Hide Results" : "View Detailed Results"}
                </Button>
              </>
            ) : (
              <div className="space-y-4 mt-4">
                <div className="border border-border rounded-lg p-5 bg-muted/30">
                  <Clock className="h-8 w-8 text-primary mx-auto mb-3" />
                  <p className="text-foreground font-semibold text-lg">Results are not available yet</p>
                  <p className="text-muted-foreground text-sm mt-2">
                    Your result will be available once the exam period ends. Please check back later.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {showScoreAndReview && showResults && (
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
                        {(() => {
                          const labels = ["A", "B", "C", "D"];
                          const qMap = optionShuffleMap[q.id];
                          // Build options in shuffled display order if map exists
                          const opts = labels.map((displayKey) => {
                            const origKey = qMap ? qMap[displayKey] : displayKey;
                            const value = origKey ? (q as any)[`option_${origKey.toLowerCase()}`] : null;
                            return { displayKey, origKey, value };
                          }).filter((opt) => opt.value);

                          return opts.map((opt) => {
                            const isStudentAnswer = q.student_answer === opt.origKey;
                            const isCorrectAnswer = q.correct_answer === opt.origKey;
                            let classes = "p-2.5 rounded-md border text-sm flex items-center gap-2";
                            if (isCorrectAnswer) {
                              classes += " border-primary bg-primary/10 text-foreground";
                            } else if (isStudentAnswer && !q.is_correct) {
                              classes += " border-destructive bg-destructive/10 text-foreground";
                            } else {
                              classes += " border-border text-muted-foreground";
                            }
                            return (
                              <div key={opt.displayKey} className={classes}>
                                <span className="font-semibold">{opt.displayKey}.</span>
                                <span className="flex-1">{opt.value}</span>
                                {isCorrectAnswer && <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />}
                                {isStudentAnswer && !q.is_correct && <span className="text-xs text-destructive font-medium">Your answer</span>}
                              </div>
                            );
                          });
                        })()}
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
                {(() => {
                  // Build ordered field list
                  const order = formSettings?.field_order || ["name", "email", "phone"];
                  // Add any custom fields not in order
                  const allCustomIds = customFieldDefs.map((cf) => `custom:${cf.id}`);
                  const fullOrder = [...order];
                  for (const cid of allCustomIds) {
                    if (!fullOrder.includes(cid)) fullOrder.push(cid);
                  }
                  // Add defaults not in order
                  for (const d of ["name", "email", "phone"]) {
                    if (!fullOrder.includes(d)) fullOrder.push(d);
                  }

                  return fullOrder.map((key) => {
                    if (key === "name") {
                      return (
                        <FormField key="name" control={form.control} name="fullName" render={({ field }) => (
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
                      );
                    }
                    if (key === "email" && (!formSettings || formSettings.email_visible)) {
                      return (
                        <FormField key="email" control={form.control} name="email" render={({ field }) => (
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
                      );
                    }
                    if (key === "phone" && (!formSettings || formSettings.phone_visible)) {
                      return (
                        <FormField key="phone" control={form.control} name="phone" render={({ field }) => (
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
                      );
                    }
                    if (key.startsWith("custom:")) {
                      const cfId = key.replace("custom:", "");
                      const cf = customFieldDefs.find((c) => c.id === cfId);
                      if (!cf) return null;
                      return (
                        <div key={cf.id} className="space-y-2">
                          <Label>
                            {cf.field_label}
                            {!cf.is_required && <span className="text-muted-foreground text-xs ml-1">(Optional)</span>}
                          </Label>
                          {cf.field_type === "dropdown" ? (
                            <select
                              value={customFieldValues[cf.id] || ""}
                              onChange={(e) =>
                                setCustomFieldValues((prev) => ({ ...prev, [cf.id]: e.target.value }))
                              }
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              required={cf.is_required}
                            >
                              <option value="">Select {cf.field_label}</option>
                              {cf.dropdown_options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              type={cf.field_type === "number" ? "number" : "text"}
                              placeholder={`Enter ${cf.field_label.toLowerCase()}`}
                              value={customFieldValues[cf.id] || ""}
                              onChange={(e) =>
                                setCustomFieldValues((prev) => ({ ...prev, [cf.id]: e.target.value }))
                              }
                              required={cf.is_required}
                            />
                          )}
                        </div>
                      );
                    }
                    return null;
                  });
                })()}

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
                  {(() => {
                    const labels = ["A", "B", "C", "D"];
                    const qMap = optionShuffleMap[q.id];
                    // Build options: if shuffle map exists, display shuffled; otherwise original
                    const opts = labels.map((displayKey) => {
                      const origKey = qMap ? qMap[displayKey] : displayKey;
                      const value = origKey ? (q as any)[`option_${origKey.toLowerCase()}`] : null;
                      return { key: displayKey, value };
                    }).filter((opt) => opt.value);
                    return opts.map((opt) => (
                      <div key={opt.key} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                        <RadioGroupItem value={opt.key} id={`${q.id}-${opt.key}`} />
                        <Label htmlFor={`${q.id}-${opt.key}`} className="cursor-pointer flex-1 text-sm">
                          <span className="font-semibold text-primary mr-2">{opt.key}.</span>
                          {opt.value}
                        </Label>
                      </div>
                    ));
                  })()}
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
