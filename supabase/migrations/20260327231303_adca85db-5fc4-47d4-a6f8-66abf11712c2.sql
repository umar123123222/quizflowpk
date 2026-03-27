CREATE POLICY "Anyone can view organization names"
  ON public.organizations
  FOR SELECT
  TO anon
  USING (true);