-- 1. Derrubar a versão antiga para garantir limpeza
DROP TRIGGER IF EXISTS on_member_added ON public.environment_members;
DROP TRIGGER IF EXISTS on_member_linked ON public.environment_members;
DROP FUNCTION IF EXISTS public.handle_new_member_notification();
DROP FUNCTION IF EXISTS public.handle_member_linked_notification();

-- 2. Criar a função com permissões de ADMIN (Security Definer)
CREATE OR REPLACE FUNCTION public.handle_new_member_notification()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  env_name TEXT;
  receiver_id UUID;
BEGIN
  receiver_id := NEW.user_id;

  SELECT environment_name INTO env_name
  FROM public.shared_environments
  WHERE id = NEW.environment_id;

  IF receiver_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (
      receiver_id,
      'Novo Convite 👥',
      'Você foi adicionado ao ambiente: ' || COALESCE(env_name, 'Grupo de Estudos'),
      '/environment/' || NEW.environment_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Criar função para quando user_id é linkado depois (convite por email)
CREATE OR REPLACE FUNCTION public.handle_member_linked_notification()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  env_name TEXT;
BEGIN
  IF OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT environment_name INTO env_name
    FROM public.shared_environments
    WHERE id = NEW.environment_id;

    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (
      NEW.user_id,
      'Novo Convite 👥',
      'Você foi adicionado ao ambiente: ' || COALESCE(env_name, 'Grupo de Estudos'),
      '/environment/' || NEW.environment_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Recriar os Gatilhos
CREATE TRIGGER on_member_added
AFTER INSERT ON public.environment_members
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_member_notification();

CREATE TRIGGER on_member_linked
AFTER UPDATE ON public.environment_members
FOR EACH ROW
EXECUTE FUNCTION public.handle_member_linked_notification();