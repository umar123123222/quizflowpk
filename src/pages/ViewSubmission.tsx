import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, Mail, User, Calendar, FileText, ClipboardList, Phone, Save, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface QuestionResult {
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
}

const ViewSubmission = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  const [textScores, setTextScores] = useState<Record<string, string>>({});
  const [submissionData, setSubmissionData] = useState<{ id: string; exam_id: string; answers: Record<string, any> } | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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

      const answersObj = (sub.answers as Record<string, any>) || {};
      const customFields = answersObj._customFields as Record<string, string> | undefined;
      const savedTextScores = answersObj._textScores as Record<string, number> | undefined;

      setSubmittedAt(sub.submitted_at);
      setSubmissionData({ id: sub.id, exam_id: sub.exam_id, answers: answersObj });
      if (answersObj._publishedAt) {
        setPublishedAt(answersObj._publishedAt as string);
      }

      const [studentRes, examRes, questionsRes] = await Promise.all([
        supabase.from("students").select("full_name, email, phone").eq("id", sub.student_id).single(),
        supabase.from("exams").select("title, organization_id").eq("id", sub.exam_id).single(),
        supabase
          .from("questions")
          .select("id, question_text, question_type, option_a, option_b, option_c, option_d, correct_answer, order_index, points")
          .eq("exam_id", sub.exam_id)
          .order("order_index", { ascending: true }),
      ]);

      setStudentName(studentRes.data?.full_name || "Unknown");
      setStudentEmail(studentRes.data?.email || "—");
      setStudentPhone(studentRes.data?.phone || "");
      setExamTitle(examRes.data?.title || "Unknown Exam");

      if (customFields && Object.keys(customFields).length > 0) {
        setCustomFieldData(customFields);
        // First try embedded labels (new format), then fall back to DB lookup
        const embeddedLabels = answersObj._customFieldLabels as Record<string, string> | undefined;
        if (embeddedLabels && Object.keys(embeddedLabels).length > 0) {
          setCustomFieldLabels(embeddedLabels);
        } else {
          const cfIds = Object.keys(customFields);
          const { data: cfDefs } = await supabase
            .from("organization_custom_fields")
            .select("id, field_label")
            .in("id", cfIds);
          if (cfDefs) {
            const labels: Record<string, string> = {};
            cfDefs.forEach((cf: any) => { labels[cf.id] = cf.field_label; });
            setCustomFieldLabels(labels);
          }
        }
      }

      const answers = answersObj as Record<string, string>;
      const sorted = questionsRes.data || [];
      let correct = 0;
      const mcqCount = sorted.filter((q) => q.question_type !== "text").length;

      // Initialize text scores from saved data
      const initialTextScores: Record<string, string> = {};

      const results: QuestionResult[] = sorted.map((q) => {
        const studentAnswer = answers[q.id] || null;
        const qType = q.question_type || "mcq";
        const isCorrect = qType === "mcq" ? studentAnswer === q.correct_answer : false;
        if (isCorrect) correct++;

        if (qType === "text" && savedTextScores && savedTextScores[q.id] !== undefined) {
          initialTextScores[q.id] = String(savedTextScores[q.id]);
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
          points: q.points ?? 1,
        };
      });

      setTextScores(initialTextScores);
      setScore(sub.score);
      setCorrectCount(correct);
      setTotalCount(mcqCount);
      setQuestionResults(results);
      setLoading(false);
    };

    fetchSubmission();
  }, [submissionId]);

  const hasTextQuestions = questionResults.some((q) => q.question_type === "text");
  const isTeacherOrOwner = !!user;

  const handleSaveGrades = async () => {
    if (!submissionData) return;
    setSaving(true);

    try {
      // Calculate total score: MCQ auto-score + text manual scores
      const mcqQuestions = questionResults.filter((q) => q.question_type !== "text");
      const textQuestions = questionResults.filter((q) => q.question_type === "text");

      const totalPoints = questionResults.reduce((sum, q) => sum + q.points, 0);

      // MCQ earned points
      const mcqEarned = mcqQuestions.reduce((sum, q) => sum + (q.is_correct ? q.points : 0), 0);

      // Text earned points
      const textScoresNumeric: Record<string, number> = {};
      let textEarned = 0;
      for (const q of textQuestions) {
        const val = parseFloat(textScores[q.id] || "0");
        const clamped = Math.min(Math.max(val, 0), q.points);
        textScoresNumeric[q.id] = clamped;
        textEarned += clamped;
      }

      const finalScore = totalPoints > 0 ? Math.round(((mcqEarned + textEarned) / totalPoints) * 100) : 0;

      // Fetch exam's passing percentage for pass/fail determination
      const { data: examForPass } = await supabase
        .from("exams")
        .select("passing_percentage")
        .eq("id", submissionData.exam_id)
        .single();
      const passingThreshold = (examForPass as any)?.passing_percentage ?? 50;
      const passFail = finalScore >= passingThreshold ? "PASS" : "FAIL";

      // Save text scores inside answers JSON and update overall score
      const now = new Date().toISOString();
      const updatedAnswers = {
        ...submissionData.answers,
        _textScores: textScoresNumeric,
        _reviewed: true,
        _publishedAt: now,
      };

      const { error } = await supabase
        .from("submissions")
        .update({ score: finalScore, answers: updatedAnswers, pass_fail: passFail } as any)
        .eq("id", submissionData.id);

      if (error) throw error;

      setScore(finalScore);
      // Update submissionData to reflect published state
      setSubmissionData((prev) => prev ? {
        ...prev,
        answers: { ...prev.answers, _textScores: textScoresNumeric, _reviewed: true, _publishedAt: now },
      } : prev);
      setPublishedAt(now);
      toast({ title: "Grades saved", description: `Final score: ${finalScore}%` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save grades.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const allTextGraded = questionResults
    .filter((q) => q.question_type === "text")
    .every((q) => textScores[q.id] !== undefined && textScores[q.id] !== "");

  const hasExceededMarks = questionResults
    .filter((q) => q.question_type === "text")
    .some((q) => textScores[q.id] !== undefined && textScores[q.id] !== "" && parseFloat(textScores[q.id]) > q.points);

  const canPublish = allTextGraded && !hasExceededMarks;

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

  const isReviewed = submissionData?.answers?._reviewed === true && !isEditing;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Published banner */}
        {isReviewed && publishedAt && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-5 py-3.5">
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
            <p className="text-sm text-green-500 font-medium">
              This result has been published to the student on{" "}
              {new Date(publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{" "}
              at {new Date(publishedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}.
            </p>
          </div>
        )}
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
                  {studentPhone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>Phone: <span className="font-medium text-foreground">{studentPhone}</span></span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>Exam: <span className="font-semibold text-foreground">{examTitle}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>Submitted: <span className="font-medium text-foreground">{formatDate(submittedAt)}</span></span>
                  </div>
                  {Object.keys(customFieldData).length > 0 && (
                    <>
                      {Object.entries(customFieldData).map(([fieldId, value]) => (
                        <div key={fieldId} className="flex items-center gap-2 text-muted-foreground">
                          <ClipboardList className="h-4 w-4 shrink-0" />
                          <span>
                            {customFieldLabels[fieldId] || fieldId}:{" "}
                            <span className="font-medium text-foreground">{value || "—"}</span>
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Right: score breakdown */}
              {(() => {
                const pendingReview = hasTextQuestions && !isReviewed;
                const mcqQuestions = questionResults.filter(q => q.question_type !== "text");
                const textQuestions = questionResults.filter(q => q.question_type === "text");
                const mcqEarned = mcqQuestions.reduce((s, q) => s + (q.is_correct ? q.points : 0), 0);
                const mcqTotal = mcqQuestions.reduce((s, q) => s + q.points, 0);
                const textTotal = textQuestions.reduce((s, q) => s + q.points, 0);
                const savedTextScores = submissionData?.answers?._textScores as Record<string, number> | undefined;
                const textEarned = isReviewed && savedTextScores
                  ? textQuestions.reduce((s, q) => s + (savedTextScores[q.id] ?? 0), 0)
                  : 0;
                const grandTotal = mcqTotal + textTotal;
                const grandEarned = mcqEarned + (isReviewed ? textEarned : 0);

                return (
                  <div className="shrink-0 space-y-3">
                    <div className="flex items-center gap-5">
                      {/* MCQ Score */}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{mcqEarned}/{mcqTotal}</div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">MCQ Score</p>
                      </div>
                      {hasTextQuestions && (
                        <>
                          <div className="w-px h-10 bg-border" />
                          {/* Text Score */}
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${pendingReview ? "text-[#e09615]" : "text-primary"}`}>
                              {pendingReview ? "—" : `${textEarned}/${textTotal}`}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{pendingReview ? "Awaiting Review" : "Text Score"}</p>
                          </div>
                        </>
                      )}
                      <div className="w-px h-10 bg-border" />
                      {/* Total */}
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${
                          pendingReview ? "text-[#e09615]"
                            : (score ?? 0) >= 70 ? "text-green-500"
                            : (score ?? 0) >= 40 ? "text-[#e09615]"
                            : "text-destructive"
                        }`}>
                          {pendingReview ? `${mcqEarned}/${grandTotal}` : `${grandEarned}/${grandTotal}`}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Total {!pendingReview && `· ${score ?? 0}%`}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Badge
                        className={`text-xs px-3 py-1 ${
                          pendingReview
                            ? "bg-[#e09615]/15 text-[#e09615] border-[#e09615]/30 hover:bg-[#e09615]/20"
                            : (score ?? 0) >= 50
                            ? "bg-green-500/15 text-green-500 border-green-500/30 hover:bg-green-500/20"
                            : "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20"
                        }`}
                      >
                        {pendingReview ? "Pending Review" : isReviewed ? "Reviewed" : (score ?? 0) >= 50 ? "Pass" : "Fail"}
                      </Badge>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>


        {/* Questions */}
        <h2 className="font-serif text-xl font-semibold mb-4">
          {hasTextQuestions ? "Text Answers — Manual Scoring" : "Answer Review"}
        </h2>
        <div className="space-y-4 pb-4">
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
                  <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isText ? (
                        <span className="h-4 w-4 text-muted-foreground text-xs font-mono">✍</span>
                      ) : q.is_correct ? (
                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive shrink-0" />
                      )}
                      <span className="text-primary font-bold">Q{index + 1}.</span>
                      {q.question_text}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {q.points} {q.points === 1 ? "mark" : "marks"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {isText ? (
                    <div className="space-y-3">
                      <div className="p-2.5 rounded-md border border-border text-sm">
                        <span className="text-muted-foreground text-xs font-medium block mb-1">Student's Answer:</span>
                        <p className="text-foreground">{q.student_answer || <span className="italic text-muted-foreground">Not answered</span>}</p>
                      </div>
                      {isTeacherOrOwner && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border border-border">
                            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                              Score:
                            </label>
                            {isReviewed ? (
                              <span className="text-sm font-semibold text-foreground">{textScores[q.id] ?? "0"}</span>
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                max={q.points}
                                step="0.5"
                                placeholder="0"
                                value={textScores[q.id] ?? ""}
                                onChange={(e) => {
                                  setTextScores((prev) => ({ ...prev, [q.id]: e.target.value }));
                                }}
                                className={`w-20 h-8 text-sm text-center ${
                                  textScores[q.id] !== undefined && textScores[q.id] !== "" && parseFloat(textScores[q.id]) > q.points
                                    ? "border-destructive focus-visible:ring-destructive"
                                    : ""
                                }`}
                              />
                            )}
                            <span className="text-xs text-muted-foreground font-medium">/ {q.points}</span>
                          </div>
                          {!isReviewed && textScores[q.id] !== undefined && textScores[q.id] !== "" && parseFloat(textScores[q.id]) > q.points && (
                            <p className="text-xs text-destructive font-medium pl-3">
                              Score cannot exceed {q.points} marks for this question.
                            </p>
                          )}
                        </div>
                      )}
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

        {/* Publish Result / Published Badge */}
        {hasTextQuestions && isTeacherOrOwner && (
          isReviewed ? (
            <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border py-4 -mx-4 px-4 flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-5 py-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-500">Result Published</p>
                  {publishedAt && (
                    <p className="text-xs text-green-500/70">
                      Published on {new Date(publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {new Date(publishedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="h-3 w-3" />
                    Edit scores &amp; republish
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Edit published result?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to edit this result? The student will see the updated score after you republish.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => setIsEditing(true)}>Yes, edit scores</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border py-4 -mx-4 px-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {hasExceededMarks ? (
                  <span className="text-destructive font-medium">Some scores exceed maximum marks</span>
                ) : canPublish ? (
                  <span className="text-green-500 font-medium">All text answers graded — ready to publish</span>
                ) : (
                  <span>
                    {questionResults.filter((q) => q.question_type === "text" && textScores[q.id] !== undefined && textScores[q.id] !== "").length}
                    {" / "}
                    {questionResults.filter((q) => q.question_type === "text").length}
                    {" text answers graded"}
                  </span>
                )}
              </div>
              <Button
                onClick={() => { handleSaveGrades(); setIsEditing(false); }}
                disabled={saving || !canPublish}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Publishing..." : isEditing ? "Republish Result" : "Publish Result"}
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ViewSubmission;
