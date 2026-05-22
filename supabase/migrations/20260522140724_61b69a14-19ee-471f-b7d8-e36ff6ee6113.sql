ALTER TABLE public.study_cycles
ADD COLUMN IF NOT EXISTS current_block_elapsed_time integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_cycle_elapsed_time(_cycle_id uuid, _seconds integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.study_cycles
  SET current_block_elapsed_time = GREATEST(0, COALESCE(current_block_elapsed_time, 0) + _seconds)
  WHERE id = _cycle_id
    AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.reset_cycle_elapsed_time(_cycle_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.study_cycles
  SET current_block_elapsed_time = 0
  WHERE id = _cycle_id
    AND user_id = auth.uid();
$$;