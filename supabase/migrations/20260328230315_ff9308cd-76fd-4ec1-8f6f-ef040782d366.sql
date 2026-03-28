-- Backfill pass_fail for existing submissions
-- MCQ-only exams (no text questions): always set pass_fail
-- Mixed/text exams: only set pass_fail if already reviewed (_reviewed = true)
UPDATE submissions s
SET pass_fail = CASE
  WHEN s.score >= COALESCE(e.passing_percentage, 50) THEN 'PASS'
  ELSE 'FAIL'
END
FROM exams e
WHERE s.exam_id = e.id
  AND s.pass_fail IS NULL
  AND s.score IS NOT NULL
  AND (
    -- MCQ-only exams (no text questions)
    NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_type = 'text')
    OR
    -- Mixed/text exams that have been reviewed
    (s.answers::jsonb->>'_reviewed')::text = 'true'
  );