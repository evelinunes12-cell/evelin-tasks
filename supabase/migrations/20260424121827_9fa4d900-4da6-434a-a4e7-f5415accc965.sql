-- Trigger function: notify other group members about a new chat message
CREATE OR REPLACE FUNCTION public.handle_new_study_group_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_name TEXT;
  v_sender_name TEXT;
  v_link TEXT;
  v_preview TEXT;
BEGIN
  SELECT name INTO v_group_name FROM public.study_groups WHERE id = NEW.group_id;

  SELECT COALESCE(NULLIF(trim(full_name), ''), username, split_part(email, '@', 1))
    INTO v_sender_name
  FROM public.profiles WHERE id = NEW.user_id;

  v_link := '/grupos-de-estudo/' || NEW.group_id;
  v_preview := CASE
    WHEN length(NEW.content) > 120 THEN substr(NEW.content, 1, 117) || '...'
    ELSE NEW.content
  END;

  -- Insert one notification per other group member, skipping recent unread ones (5 min de-dupe)
  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT
    m.user_id,
    'Nova mensagem em ' || COALESCE(v_group_name, 'grupo de estudo') || ' 💬',
    COALESCE(v_sender_name, 'Alguém') || ': ' || v_preview,
    v_link
  FROM public.study_group_members m
  WHERE m.group_id = NEW.group_id
    AND m.user_id <> NEW.user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = m.user_id
        AND n.link = v_link
        AND n.read = false
        AND n.created_at > now() - interval '5 minutes'
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_study_group_message_notification
  ON public.study_group_messages;

CREATE TRIGGER trg_new_study_group_message_notification
  AFTER INSERT ON public.study_group_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_study_group_message_notification();

-- Helper: mark all chat notifications of a group as read for the calling user
CREATE OR REPLACE FUNCTION public.mark_study_group_messages_notifications_read(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.notifications
  SET read = true
  WHERE user_id = auth.uid()
    AND link = '/grupos-de-estudo/' || p_group_id::text
    AND read = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_study_group_messages_notifications_read(uuid) TO authenticated;