CREATE POLICY "Anon can select students by email" ON public.students
FOR SELECT TO anon
USING (true);

CREATE POLICY "Anon can check existing submissions" ON public.submissions
FOR SELECT TO anon
USING (true);