CREATE TABLE public.organization_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_number text,
  subject text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, teacher_id)
);

ALTER TABLE public.organization_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage teachers in their org"
  ON public.organization_teachers
  FOR ALL
  TO authenticated
  USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Teachers can view their own membership"
  ON public.organization_teachers
  FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());