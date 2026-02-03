-- Add parent_id, is_default and order_index to environment_statuses
ALTER TABLE public.environment_statuses 
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.environment_statuses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0;

-- Add parent_id to task_statuses for user personal statuses
ALTER TABLE public.task_statuses 
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.task_statuses(id) ON DELETE CASCADE;

-- Update existing default statuses to mark them as default and set order
UPDATE public.environment_statuses 
SET is_default = true, order_index = 0 
WHERE name = 'A Fazer' AND parent_id IS NULL;

UPDATE public.environment_statuses 
SET is_default = true, order_index = 1 
WHERE name = 'Em Progresso' AND parent_id IS NULL;

UPDATE public.environment_statuses 
SET is_default = true, order_index = 2 
WHERE name = 'Concluído' AND parent_id IS NULL;

-- Update the function to set is_default and order_index
CREATE OR REPLACE FUNCTION public.create_default_environment_statuses(target_environment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert 'A Fazer' if not exists
  INSERT INTO public.environment_statuses (environment_id, name, color, is_default, order_index)
  SELECT target_environment_id, 'A Fazer', '#6B7280', true, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM public.environment_statuses 
    WHERE environment_id = target_environment_id AND name = 'A Fazer' AND parent_id IS NULL
  );

  -- Insert 'Em Progresso' if not exists
  INSERT INTO public.environment_statuses (environment_id, name, color, is_default, order_index)
  SELECT target_environment_id, 'Em Progresso', '#3B82F6', true, 1
  WHERE NOT EXISTS (
    SELECT 1 FROM public.environment_statuses 
    WHERE environment_id = target_environment_id AND name = 'Em Progresso' AND parent_id IS NULL
  );

  -- Insert 'Concluído' if not exists
  INSERT INTO public.environment_statuses (environment_id, name, color, is_default, order_index)
  SELECT target_environment_id, 'Concluído', '#22C55E', true, 2
  WHERE NOT EXISTS (
    SELECT 1 FROM public.environment_statuses 
    WHERE environment_id = target_environment_id AND name = 'Concluído' AND parent_id IS NULL
  );
END;
$$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_environment_statuses_parent_id ON public.environment_statuses(parent_id);
CREATE INDEX IF NOT EXISTS idx_task_statuses_parent_id ON public.task_statuses(parent_id);