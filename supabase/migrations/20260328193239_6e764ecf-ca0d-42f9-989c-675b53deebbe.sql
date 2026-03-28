
CREATE TABLE public.organization_form_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE,
  name_visible boolean NOT NULL DEFAULT true,
  name_required boolean NOT NULL DEFAULT true,
  email_visible boolean NOT NULL DEFAULT true,
  email_required boolean NOT NULL DEFAULT true,
  phone_visible boolean NOT NULL DEFAULT true,
  phone_required boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS policies
ALTER TABLE public.organization_form_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their org form settings"
ON public.organization_form_settings
FOR ALL
TO authenticated
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Anyone can view form settings for published exams"
ON public.organization_form_settings
FOR SELECT
TO anon
USING (true);
