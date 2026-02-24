
-- Add subject_id to focus_sessions for per-subject analytics
ALTER TABLE public.focus_sessions
ADD COLUMN subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL;

-- Index for analytics queries
CREATE INDEX idx_focus_sessions_subject ON public.focus_sessions(subject_id) WHERE subject_id IS NOT NULL;
