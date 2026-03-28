CREATE POLICY "Owners can view their teachers profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT ot.teacher_id
    FROM organization_teachers ot
    JOIN organizations o ON o.id = ot.organization_id
    WHERE o.owner_id = auth.uid()
  )
);