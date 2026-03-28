ALTER TABLE public.exams ADD COLUMN shuffle_questions boolean NOT NULL DEFAULT false;
ALTER TABLE public.exams ADD COLUMN shuffle_options boolean NOT NULL DEFAULT false;