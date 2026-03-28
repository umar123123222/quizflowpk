CREATE TABLE public.exam_reattempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_email text NOT NULL,
  granted_by uuid NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (exam_id, student_email)
);

ALTER TABLE public.exam_reattempts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage reattempts for their exams
CREATE POLICY "Users can manage reattempts for their exams"
ON public.exam_reattempts
FOR ALL
TO authenticated
USING (
  exam_id IN (
    SELECT id FROM exams WHERE created_by = auth.uid()
    UNION
    SELECT id FROM exams WHERE organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  )
)
WITH CHECK (
  exam_id IN (
    SELECT id FROM exams WHERE created_by = auth.uid()
    UNION
    SELECT id FROM exams WHERE organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  )
);

-- Anonymous users can check if they have a reattempt permission
CREATE POLICY "Anon can check reattempt permissions"
ON public.exam_reattempts
FOR SELECT
TO anon
USING (true);