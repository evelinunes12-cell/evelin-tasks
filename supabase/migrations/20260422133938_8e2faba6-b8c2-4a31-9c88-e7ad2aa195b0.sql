CREATE OR REPLACE FUNCTION public.notify_study_group_member_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_name TEXT;
  v_group_creator UUID;
BEGIN
  SELECT name, created_by INTO v_group_name, v_group_creator
  FROM public.study_groups
  WHERE id = NEW.group_id;

  IF NEW.user_id = v_group_creator THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, link)
  VALUES (
    NEW.user_id,
    'Você entrou em um grupo de estudo',
    'Você agora faz parte do grupo "' || COALESCE(v_group_name, 'Grupo') || '".',
    '/grupos-de-estudo/' || NEW.group_id::text
  );

  RETURN NEW;
END;
$$;