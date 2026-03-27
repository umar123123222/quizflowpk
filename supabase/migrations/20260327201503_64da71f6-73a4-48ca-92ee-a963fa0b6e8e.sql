
-- Allow anonymous users to read published exams
CREATE POLICY "Anyone can view published exams"
ON public.exams
FOR SELECT
TO anon
USING (is_published = true);

-- Allow anonymous users to read questions for published exams
CREATE POLICY "Anyone can view questions for published exams"
ON public.questions
FOR SELECT
TO anon
USING (exam_id IN (SELECT id FROM public.exams WHERE is_published = true));

-- Allow anonymous users to insert students (for exam registration)
CREATE POLICY "Anyone can register as student"
ON public.students
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to insert submissions
CREATE POLICY "Anyone can submit exam answers"
ON public.submissions
FOR INSERT
TO anon
WITH CHECK (true);

-- Add phone column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS phone text;
