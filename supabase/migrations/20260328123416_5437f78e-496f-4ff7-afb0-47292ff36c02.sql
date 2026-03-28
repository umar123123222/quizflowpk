-- Add code column
ALTER TABLE public.exams ADD COLUMN code text;

-- Create a function to generate random 6-char alphanumeric codes
CREATE OR REPLACE FUNCTION public.generate_exam_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * 62 + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Backfill existing exams with unique codes
DO $$
DECLARE
  exam_record RECORD;
  new_code text;
  code_exists boolean;
BEGIN
  FOR exam_record IN SELECT id FROM public.exams WHERE code IS NULL LOOP
    LOOP
      new_code := public.generate_exam_code();
      SELECT EXISTS(SELECT 1 FROM public.exams WHERE code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    UPDATE public.exams SET code = new_code WHERE id = exam_record.id;
  END LOOP;
END;
$$;

-- Now make it NOT NULL and UNIQUE, with a default for future inserts
ALTER TABLE public.exams ALTER COLUMN code SET NOT NULL;
ALTER TABLE public.exams ALTER COLUMN code SET DEFAULT public.generate_exam_code();
ALTER TABLE public.exams ADD CONSTRAINT exams_code_unique UNIQUE (code);