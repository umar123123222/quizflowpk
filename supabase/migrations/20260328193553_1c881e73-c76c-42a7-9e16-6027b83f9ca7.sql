
CREATE TABLE public.organization_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  is_required boolean NOT NULL DEFAULT false,
  dropdown_options jsonb DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.organization_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their org custom fields"
ON public.organization_custom_fields
FOR ALL
TO authenticated
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Anyone can view custom fields"
ON public.organization_custom_fields
FOR SELECT
TO anon
USING (true);
