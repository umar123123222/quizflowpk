CREATE POLICY "Authenticated can register as student"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can insert submissions"
ON public.submissions
FOR INSERT
TO authenticated
WITH CHECK (true);