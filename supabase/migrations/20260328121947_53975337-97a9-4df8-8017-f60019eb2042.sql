ALTER TABLE public.students ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.students DROP CONSTRAINT students_created_by_fkey;