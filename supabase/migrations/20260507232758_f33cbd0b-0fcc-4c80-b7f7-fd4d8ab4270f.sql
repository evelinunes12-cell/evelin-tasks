-- Restrict EXECUTE on chat-related SECURITY DEFINER functions to authenticated users only
REVOKE EXECUTE ON FUNCTION public.mark_environment_messages_notifications_read(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_study_group_messages_notifications_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_environment_messages_notifications_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_study_group_messages_notifications_read(uuid) TO authenticated;

-- Trigger functions should not be invokable by clients at all
REVOKE EXECUTE ON FUNCTION public.handle_new_environment_message_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_study_group_message_notification() FROM PUBLIC, anon, authenticated;

-- Add explicit auth check inside callable functions as defense-in-depth
CREATE OR REPLACE FUNCTION public.mark_environment_messages_notifications_read(p_environment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.notifications
  SET read = true
  WHERE user_id = auth.uid()
    AND link = '/environment/' || p_environment_id::text
    AND read = false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_study_group_messages_notifications_read(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.notifications
  SET read = true
  WHERE user_id = auth.uid()
    AND link = '/grupos-de-estudo/' || p_group_id::text
    AND read = false;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.mark_environment_messages_notifications_read(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_study_group_messages_notifications_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_environment_messages_notifications_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_study_group_messages_notifications_read(uuid) TO authenticated;