import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";

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
  const [examTitle, setExamTitle] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);

  useEffect(() => {
    const fetchSubmission = async () => {
      if (!submissionId) return;

      // Fetch submission
      const { data: sub, error: subErr } = await supabase
        .from("submissions")
        .select("id, exam_id, student_id, score, answers")
        .eq("id", submissionId)
        .single();

      if (subErr || !sub) {
        setError("Submission not found.");
        setLoading(false);
        return;
      }

      // Fetch student
      const { data: student } = await supabase
        .from("students")
        .select("full_name")
        .eq("id", sub.student_id)
        .single();

      setStudentName(student?.full_name || "Unknown");

      // Fetch exam
      const { data: exam } = await supabase
        .from("exams")
        .select("title")
        .eq("id", sub.exam_id)
        .single();

      setExamTitle(exam?.title || "Unknown Exam");

      // Fetch questions with correct answers
      const { data: questions } = await supabase
        .from("questions")
        .select("id, question_text, question_type, option_a, option_b, option_c, option_d, correct_answer, order_index")
        .eq("exam_id", sub.exam_id)
        .order("order_index", { ascending: true });

      const answers = (sub.answers as Record<string, string>) || {};
      const sorted = questions || [];
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex-1 flex flex-col items-center px-4 py-12">
        {/* Summary */}
        <div className="max-w-md w-full text-center space-y-6 mb-10">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-bold">Submission Details</h1>
          <div className="space-y-2">
            <p className="text-muted-foreground text-lg">
              Student: <span className="font-semibold text-foreground">{studentName}</span>
            </p>
            <p className="text-muted-foreground">
              Exam: <span className="font-semibold text-foreground">{examTitle}</span>
            </p>
          </div>
          <div className="flex items-center justify-center gap-6 mt-2">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{correctCount}/{totalCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Correct Answers</p>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{score ?? 0}%</div>
              <p className="text-xs text-muted-foreground mt-1">Score</p>
            </div>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="max-w-3xl w-full space-y-4 pb-8">
          <h3 className="font-serif text-lg font-semibold">Answer Review</h3>
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
                              {isStudentAnswer && !q.is_correct && <span className="text-xs text-destructive font-medium">Student's answer</span>}
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
