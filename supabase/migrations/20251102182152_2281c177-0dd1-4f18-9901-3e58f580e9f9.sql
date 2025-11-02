-- Add checklist column to task_steps table
ALTER TABLE public.task_steps
ADD COLUMN checklist jsonb DEFAULT '[]'::jsonb;