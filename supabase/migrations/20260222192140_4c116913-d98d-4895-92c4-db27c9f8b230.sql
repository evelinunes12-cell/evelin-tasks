
ALTER TABLE public.study_cycles
ADD COLUMN current_block_index integer NOT NULL DEFAULT 0,
ADD COLUMN current_block_remaining_seconds integer;
