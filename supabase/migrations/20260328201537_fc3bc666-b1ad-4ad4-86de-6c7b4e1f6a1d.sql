ALTER TABLE public.exams ADD COLUMN start_time timestamptz DEFAULT NULL;
ALTER TABLE public.exams ADD COLUMN end_time timestamptz DEFAULT NULL;