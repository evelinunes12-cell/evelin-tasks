-- 1. Add is_default and order_index columns to task_statuses
ALTER TABLE public.task_statuses 
ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0;

-- 2. Create function to insert default statuses for a user (idempotent)
CREATE OR REPLACE FUNCTION public.create_default_task_statuses(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert 'A Fazer' if not exists
  INSERT INTO public.task_statuses (user_id, name, order_index, is_default, color)
  SELECT target_user_id, 'A Fazer', 0, true, '#6B7280'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.task_statuses 
    WHERE user_id = target_user_id AND name = 'A Fazer'
  );
  
  -- Update existing 'A Fazer' to be default
  UPDATE public.task_statuses 
  SET is_default = true, order_index = 0
  WHERE user_id = target_user_id AND name = 'A Fazer';

  -- Insert 'Em Progresso' if not exists
  INSERT INTO public.task_statuses (user_id, name, order_index, is_default, color)
  SELECT target_user_id, 'Em Progresso', 1, true, '#3B82F6'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.task_statuses 
    WHERE user_id = target_user_id AND name = 'Em Progresso'
  );
  
  -- Update existing 'Em Progresso' to be default
  UPDATE public.task_statuses 
  SET is_default = true, order_index = 1
  WHERE user_id = target_user_id AND name = 'Em Progresso';

  -- Insert 'Concluído' if not exists
  INSERT INTO public.task_statuses (user_id, name, order_index, is_default, color)
  SELECT target_user_id, 'Concluído', 2, true, '#22C55E'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.task_statuses 
    WHERE user_id = target_user_id AND name = 'Concluído'
  );
  
  -- Update existing 'Concluído' to be default
  UPDATE public.task_statuses 
  SET is_default = true, order_index = 2
  WHERE user_id = target_user_id AND name = 'Concluído';
END;
$$;

-- 3. Create trigger function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_default_statuses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.create_default_task_statuses(NEW.id);
  RETURN NEW;
END;
$$;

-- 4. Create trigger on profiles table (fires after new profile is created)
DROP TRIGGER IF EXISTS on_profile_created_add_default_statuses ON public.profiles;
CREATE TRIGGER on_profile_created_add_default_statuses
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_default_statuses();

-- 5. Run migration for ALL existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM public.profiles
  LOOP
    PERFORM public.create_default_task_statuses(user_record.id);
  END LOOP;
END;
$$;