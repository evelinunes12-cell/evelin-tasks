ALTER TABLE public.study_schedules ADD COLUMN IF NOT EXISTS specific_date date;

UPDATE public.study_schedules
SET specific_date = created_at::date
WHERE type = 'variable' AND specific_date IS NULL;