-- Evitar notificações duplicadas quando o usuário já é membro do ambiente
CREATE OR REPLACE FUNCTION public.handle_new_member_notification()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  env_name TEXT;
  receiver_id UUID;
  already_member BOOLEAN;
BEGIN
  receiver_id := NEW.user_id;

  IF receiver_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verifica se já existe outra associação do usuário ao mesmo ambiente
  SELECT EXISTS (
    SELECT 1 FROM public.environment_members
    WHERE environment_id = NEW.environment_id
      AND user_id = receiver_id
      AND id <> NEW.id
  ) INTO already_member;

  IF already_member THEN
    RETURN NEW;
  END IF;

  SELECT environment_name INTO env_name
  FROM public.shared_environments
  WHERE id = NEW.environment_id;

  INSERT INTO public.notifications (user_id, title, message, link)
  VALUES (
    receiver_id,
    'Novo Convite 👥',
    'Você foi adicionado ao ambiente: ' || COALESCE(env_name, 'Grupo de Estudos'),
    '/environment/' || NEW.environment_id
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_member_linked_notification()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  env_name TEXT;
  already_member BOOLEAN;
BEGIN
  IF OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
    -- Verifica se já existe outra associação do usuário ao mesmo ambiente
    SELECT EXISTS (
      SELECT 1 FROM public.environment_members
      WHERE environment_id = NEW.environment_id
        AND user_id = NEW.user_id
        AND id <> NEW.id
    ) INTO already_member;

    IF already_member THEN
      RETURN NEW;
    END IF;

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