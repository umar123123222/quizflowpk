
ALTER TABLE public.organization_form_settings
ADD COLUMN field_order jsonb DEFAULT '["name","email","phone"]'::jsonb;
