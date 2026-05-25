-- Fix: remove overlapping UPDATE policy that allowed role self-escalation on study_group_members
DROP POLICY IF EXISTS "Members can update own privacy" ON public.study_group_members;

-- Fix: environment_threads is not used via realtime in the client; remove it from the realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.environment_threads;