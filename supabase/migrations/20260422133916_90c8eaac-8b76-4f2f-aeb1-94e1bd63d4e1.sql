-- Function to notify a user when added to a study group
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
  -- Fetch group info
  SELECT name, created_by INTO v_group_name, v_group_creator
  FROM public.study_groups
  WHERE id = NEW.group_id;

  -- Skip notifying the creator when they self-add as admin on group creation
  IF NEW.user_id = v_group_creator THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, link)
  VALUES (
    NEW.user_id,
    'Você entrou em um grupo de estudo',
    'Você agora faz parte do grupo "' || COALESCE(v_group_name, 'Grupo') || '".',
    '/study-groups/' || NEW.group_id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_study_group_member_added ON public.study_group_members;

CREATE TRIGGER trg_notify_study_group_member_added
AFTER INSERT ON public.study_group_members
FOR EACH ROW
EXECUTE FUNCTION public.notify_study_group_member_added();