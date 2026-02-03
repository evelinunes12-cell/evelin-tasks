-- Create function to create default environment statuses
CREATE OR REPLACE FUNCTION public.create_default_environment_statuses(target_environment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert 'A Fazer' if not exists
  INSERT INTO public.environment_statuses (environment_id, name, color)
  SELECT target_environment_id, 'A Fazer', '#6B7280'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.environment_statuses 
    WHERE environment_id = target_environment_id AND name = 'A Fazer'
  );

  -- Insert 'Em Progresso' if not exists
  INSERT INTO public.environment_statuses (environment_id, name, color)
  SELECT target_environment_id, 'Em Progresso', '#3B82F6'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.environment_statuses 
    WHERE environment_id = target_environment_id AND name = 'Em Progresso'
  );

  -- Insert 'Concluído' if not exists
  INSERT INTO public.environment_statuses (environment_id, name, color)
  SELECT target_environment_id, 'Concluído', '#22C55E'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.environment_statuses 
    WHERE environment_id = target_environment_id AND name = 'Concluído'
  );
END;
$$;

-- Create trigger function to handle new environment creation
CREATE OR REPLACE FUNCTION public.handle_new_environment_default_statuses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.create_default_environment_statuses(NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger on shared_environments table
DROP TRIGGER IF EXISTS on_environment_created_default_statuses ON public.shared_environments;
CREATE TRIGGER on_environment_created_default_statuses
  AFTER INSERT ON public.shared_environments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_environment_default_statuses();

-- Migrate existing environments that don't have default statuses
DO $$
DECLARE
  env_record RECORD;
BEGIN
  FOR env_record IN SELECT id FROM public.shared_environments LOOP
    PERFORM public.create_default_environment_statuses(env_record.id);
  END LOOP;
END;
$$;