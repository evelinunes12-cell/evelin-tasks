ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS questions_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS questions_correct integer NOT NULL DEFAULT 0;