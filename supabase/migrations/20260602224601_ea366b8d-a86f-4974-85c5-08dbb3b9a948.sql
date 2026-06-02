CREATE TABLE public.study_cycle_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  cycle_id uuid NOT NULL REFERENCES public.study_cycles(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_cycle_notes TO authenticated;
GRANT ALL ON public.study_cycle_notes TO service_role;

ALTER TABLE public.study_cycle_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cycle notes"
ON public.study_cycle_notes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cycle notes"
ON public.study_cycle_notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cycle notes"
ON public.study_cycle_notes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cycle notes"
ON public.study_cycle_notes FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_study_cycle_notes_cycle ON public.study_cycle_notes(cycle_id);
CREATE INDEX idx_study_cycle_notes_user ON public.study_cycle_notes(user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_study_cycle_notes_updated_at
BEFORE UPDATE ON public.study_cycle_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();