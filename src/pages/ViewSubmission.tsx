import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertTriangle, Mail, User, Calendar, FileText, ClipboardList, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuestionResult {
  question_text: string;
  question_type: string;
  student_answer: string | null;
  correct_answer: string | null;
  is_correct: boolean;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
}

const ViewSubmission = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [examTitle, setExamTitle] = useState("");
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [customFieldData, setCustomFieldData] = useState<Record<string, string>>({});
  const [customFieldLabels, setCustomFieldLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchSubmission = async () => {
      if (!submissionId) return;

      const { data: sub, error: subErr } = await supabase
        .from("submissions")
        .select("id, exam_id, student_id, score, answers, submitted_at")
        .eq("id", submissionId)
        .single();

      if (subErr || !sub) {
        setError("Submission not found.");
        setLoading(false);
        return;
      }

      // Extract custom fields from answers
      const answersObj = (sub.answers as Record<string, any>) || {};
      const customFields = answersObj._customFields as Record<string, string> | undefined;

      setSubmittedAt(sub.submitted_at);

      // Fetch student & exam in parallel
      const [studentRes, examRes, questionsRes] = await Promise.all([
        supabase.from("students").select("full_name, email").eq("id", sub.student_id).single(),
        supabase.from("exams").select("title").eq("id", sub.exam_id).single(),
        supabase
          .from("questions")
          .select("id, question_text, question_type, option_a, option_b, option_c, option_d, correct_answer, order_index")
          .eq("exam_id", sub.exam_id)
          .order("order_index", { ascending: true }),
      ]);

      setStudentName(studentRes.data?.full_name || "Unknown");
      setStudentEmail(studentRes.data?.email || "—");
      setExamTitle(examRes.data?.title || "Unknown Exam");

      const answers = (sub.answers as Record<string, string>) || {};
      const sorted = questionsRes.data || [];
      let correct = 0;
      const mcqCount = sorted.filter((q) => q.question_type !== "text").length;

      const results: QuestionResult[] = sorted.map((q) => {
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

      setScore(sub.score);
      setCorrectCount(correct);
      setTotalCount(mcqCount);
      setQuestionResults(results);
      setLoading(false);
    };

    fetchSubmission();
  }, [submissionId]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground animate-pulse">Loading submission...</p>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header card with student & exam info */}
        <Card className="mb-8">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              {/* Left: student info */}
              <div className="space-y-3">
                <h1 className="font-serif text-2xl md:text-3xl font-bold">Submission Details</h1>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4 shrink-0" />
                    <span>Student: <span className="font-semibold text-foreground">{studentName}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span>Email: <span className="font-medium text-foreground">{studentEmail}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>Exam: <span className="font-semibold text-foreground">{examTitle}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>Submitted: <span className="font-medium text-foreground">{formatDate(submittedAt)}</span></span>
                  </div>
                </div>
              </div>

              {/* Right: score */}
              <div className="flex items-center gap-6 md:gap-8 shrink-0">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">{correctCount}/{totalCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Correct</p>
                </div>
                <div className="w-px h-14 bg-border" />
                <div className="text-center">
                  <div className={`text-4xl font-bold ${
                    (score ?? 0) >= 70
                      ? "text-green-500"
                      : (score ?? 0) >= 40
                      ? "text-yellow-500"
                      : "text-destructive"
                  }`}>
                    {score ?? 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Score</p>
                </div>
                <div className="w-px h-14 bg-border" />
                <div className="text-center flex items-center">
                  <Badge
                    className={`text-sm px-4 py-1.5 ${
                      (score ?? 0) >= 50
                        ? "bg-green-500/15 text-green-500 border-green-500/30 hover:bg-green-500/20"
                        : "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20"
                    }`}
                  >
                    {(score ?? 0) >= 50 ? "Pass" : "Fail"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <h2 className="font-serif text-xl font-semibold mb-4">Answer Review</h2>
        <div className="space-y-4 pb-10">
          {questionResults.map((q, index) => {
            const isText = q.question_type === "text";
            return (
              <Card
                key={index}
                className={`overflow-hidden border-l-4 ${
                  isText
                    ? "border-l-muted"
                    : q.is_correct
                    ? "border-l-green-500"
                    : "border-l-destructive"
                }`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {isText ? (
                      <span className="h-4 w-4 text-muted-foreground text-xs font-mono">✍</span>
                    ) : q.is_correct ? (
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive shrink-0" />
                    )}
                    <span className="text-primary font-bold">Q{index + 1}.</span>
                    {q.question_text}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {isText ? (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-md border border-border text-sm">
                        <span className="text-muted-foreground text-xs font-medium block mb-1">Student's Answer:</span>
                        <p className="text-foreground">{q.student_answer || <span className="italic text-muted-foreground">Not answered</span>}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Text answers require manual review.</p>
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

                          let classes = "p-2.5 rounded-md border text-sm flex items-center gap-2 transition-colors";
                          if (isCorrectAnswer) {
                            classes += " border-green-500 bg-green-500/10 text-foreground";
                          } else if (isStudentAnswer && !q.is_correct) {
                            classes += " border-destructive bg-destructive/10 text-foreground";
                          } else {
                            classes += " border-border text-muted-foreground";
                          }

                          return (
                            <div key={opt.key} className={classes}>
                              <span className="font-semibold w-6">{opt.key}.</span>
                              <span className="flex-1">{opt.value}</span>
                              {isCorrectAnswer && (
                                <span className="flex items-center gap-1 shrink-0">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="text-xs text-green-500 font-medium">Correct</span>
                                </span>
                              )}
                              {isStudentAnswer && !q.is_correct && (
                                <span className="flex items-center gap-1 shrink-0">
                                  <XCircle className="h-4 w-4 text-destructive" />
                                  <span className="text-xs text-destructive font-medium">Student's pick</span>
                                </span>
                              )}
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
      </div>
    </div>
  );
};

export default ViewSubmission;
