-- Add checklist column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN checklist JSONB DEFAULT '[]'::jsonb;