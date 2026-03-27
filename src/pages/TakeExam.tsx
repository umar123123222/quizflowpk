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
import { User, Mail, Phone, Clock, CheckCircle, AlertTriangle } from "lucide-react";
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
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasAutoSubmitted = useRef(false);

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
    setSubmitting(true);

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

    // Calculate score
    const { data: fullQuestions } = await supabase
      .from("questions")
      .select("id, correct_answer")
      .eq("exam_id", id);

    let correctCount = 0;
    (fullQuestions || []).forEach((q) => {
      if (answers[q.id] === q.correct_answer) correctCount++;
    });
    const totalQuestions = fullQuestions?.length || 1;
    const calculatedScore = Math.round((correctCount / totalQuestions) * 100);

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

  // Submitted state
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="font-serif text-2xl font-bold">Exam Submitted!</h2>
            <p className="text-muted-foreground">
              Thank you, <span className="font-semibold text-foreground">{studentInfo?.fullName}</span>.
            </p>
            {score !== null && (
              <div className="text-4xl font-bold text-primary">{score}%</div>
            )}
            <p className="text-sm text-muted-foreground">Your answers have been recorded.</p>
          </CardContent>
        </Card>
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
    </div>
  );
};

export default TakeExam;
