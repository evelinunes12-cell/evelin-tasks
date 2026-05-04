-- Threads table
CREATE TABLE public.environment_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_id UUID NOT NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  source_message_id UUID REFERENCES public.environment_messages(id) ON DELETE SET NULL,
  source_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_environment_threads_env ON public.environment_threads(environment_id);
CREATE INDEX idx_environment_threads_source_msg ON public.environment_threads(source_message_id);
CREATE INDEX idx_environment_threads_source_task ON public.environment_threads(source_task_id);

ALTER TABLE public.environment_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members or owner can view environment threads"
ON public.environment_threads FOR SELECT
USING (EXISTS (
  SELECT 1 FROM shared_environments se
  WHERE se.id = environment_threads.environment_id
    AND (se.owner_id = auth.uid() OR is_environment_member(se.id, auth.uid()))
));

CREATE POLICY "Members or owner can create environment threads"
ON public.environment_threads FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND EXISTS (
    SELECT 1 FROM shared_environments se
    WHERE se.id = environment_threads.environment_id
      AND (se.owner_id = auth.uid() OR is_environment_member(se.id, auth.uid()))
  )
);

CREATE POLICY "Authors or env owners can update environment threads"
ON public.environment_threads FOR UPDATE
USING (
  auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM shared_environments se
    WHERE se.id = environment_threads.environment_id AND se.owner_id = auth.uid()
  )
);

CREATE POLICY "Authors or env owners can delete environment threads"
ON public.environment_threads FOR DELETE
USING (
  auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM shared_environments se
    WHERE se.id = environment_threads.environment_id AND se.owner_id = auth.uid()
  )
);

CREATE TRIGGER update_environment_threads_updated_at
BEFORE UPDATE ON public.environment_threads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.environment_threads;

-- Add thread_id to environment_messages
ALTER TABLE public.environment_messages
ADD COLUMN thread_id UUID REFERENCES public.environment_threads(id) ON DELETE CASCADE;

CREATE INDEX idx_environment_messages_thread ON public.environment_messages(thread_id);