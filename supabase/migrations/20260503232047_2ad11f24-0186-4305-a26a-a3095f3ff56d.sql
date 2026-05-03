ALTER TABLE public.study_group_messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.study_group_messages(id) ON DELETE SET NULL;
ALTER TABLE public.environment_messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.environment_messages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_study_group_messages_reply_to ON public.study_group_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_environment_messages_reply_to ON public.environment_messages(reply_to_id);