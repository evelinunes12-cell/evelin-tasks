-- Add visibility columns to task_statuses
ALTER TABLE public.task_statuses
ADD COLUMN show_in_dashboard boolean NOT NULL DEFAULT true,
ADD COLUMN show_in_kanban boolean NOT NULL DEFAULT true;

-- Add visibility columns to environment_statuses for consistency
ALTER TABLE public.environment_statuses
ADD COLUMN show_in_dashboard boolean NOT NULL DEFAULT true,
ADD COLUMN show_in_kanban boolean NOT NULL DEFAULT true;

-- Update the create_default_task_statuses function to include visibility
CREATE OR REPLACE FUNCTION public.create_default_task_statuses(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert 'A Fazer' if not exists
  INSERT INTO public.task_statuses (user_id, name, order_index, is_default, color, show_in_dashboard, show_in_kanban)
  SELECT target_user_id, 'A Fazer', 0, true, '#6B7280', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.task_statuses 
    WHERE user_id = target_user_id AND name = 'A Fazer'
  );
  
  -- Update existing 'A Fazer' to be default
  UPDATE public.task_statuses 
  SET is_default = true, order_index = 0
  WHERE user_id = target_user_id AND name = 'A Fazer';

  -- Insert 'Em Progresso' if not exists
  INSERT INTO public.task_statuses (user_id, name, order_index, is_default, color, show_in_dashboard, show_in_kanban)
  SELECT target_user_id, 'Em Progresso', 1, true, '#3B82F6', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.task_statuses 
    WHERE user_id = target_user_id AND name = 'Em Progresso'
  );
  
  -- Update existing 'Em Progresso' to be default
  UPDATE public.task_statuses 
  SET is_default = true, order_index = 1
  WHERE user_id = target_user_id AND name = 'Em Progresso';

  -- Insert 'Concluído' if not exists
  INSERT INTO public.task_statuses (user_id, name, order_index, is_default, color, show_in_dashboard, show_in_kanban)
  SELECT target_user_id, 'Concluído', 2, true, '#22C55E', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.task_statuses 
    WHERE user_id = target_user_id AND name = 'Concluído'
  );
  
  -- Update existing 'Concluído' to be default
  UPDATE public.task_statuses 
  SET is_default = true, order_index = 2
  WHERE user_id = target_user_id AND name = 'Concluído';
END;
$function$;

-- Update the create_default_environment_statuses function
CREATE OR REPLACE FUNCTION public.create_default_environment_statuses(target_environment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert 'A Fazer' if not exists
  INSERT INTO public.environment_statuses (environment_id, name, color, is_default, order_index, show_in_dashboard, show_in_kanban)
  SELECT target_environment_id, 'A Fazer', '#6B7280', true, 0, true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.environment_statuses 
    WHERE environment_id = target_environment_id AND name = 'A Fazer' AND parent_id IS NULL
  );

  -- Insert 'Em Progresso' if not exists
  INSERT INTO public.environment_statuses (environment_id, name, color, is_default, order_index, show_in_dashboard, show_in_kanban)
  SELECT target_environment_id, 'Em Progresso', '#3B82F6', true, 1, true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.environment_statuses 
    WHERE environment_id = target_environment_id AND name = 'Em Progresso' AND parent_id IS NULL
  );

  -- Insert 'Concluído' if not exists
  INSERT INTO public.environment_statuses (environment_id, name, color, is_default, order_index, show_in_dashboard, show_in_kanban)
  SELECT target_environment_id, 'Concluído', '#22C55E', true, 2, true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.environment_statuses 
    WHERE environment_id = target_environment_id AND name = 'Concluído' AND parent_id IS NULL
  );
END;
$function$;