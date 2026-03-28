CREATE POLICY "Authenticated can select students"
ON public.students
FOR SELECT
TO authenticated
USING (true);