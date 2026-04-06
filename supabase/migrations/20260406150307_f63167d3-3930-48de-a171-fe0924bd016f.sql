
-- Add logo_url column to organizations
ALTER TABLE public.organizations ADD COLUMN logo_url text;

-- Create storage bucket for org logos
INSERT INTO storage.buckets (id, name, public) VALUES ('org-logos', 'org-logos', true);

-- Allow anyone to view logos
CREATE POLICY "Public read access for org logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-logos');

-- Allow authenticated org owners to upload logos
CREATE POLICY "Org owners can upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'org-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow org owners to update their logos
CREATE POLICY "Org owners can update logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'org-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow org owners to delete their logos
CREATE POLICY "Org owners can delete logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'org-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
