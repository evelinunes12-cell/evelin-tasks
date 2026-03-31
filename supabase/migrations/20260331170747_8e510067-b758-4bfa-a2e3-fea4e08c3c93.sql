ALTER TABLE public.study_cycles 
  ADD COLUMN start_date date DEFAULT NULL,
  ADD COLUMN end_date date DEFAULT NULL,
  ADD COLUMN is_advanced boolean NOT NULL DEFAULT false,
  ADD COLUMN hours_per_day numeric DEFAULT NULL,
  ADD COLUMN hours_per_week numeric DEFAULT NULL;