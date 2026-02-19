
-- Update broadcast notification RPC to accept optional link
CREATE OR REPLACE FUNCTION public.send_broadcast_notification(p_title text, p_message text, p_type notification_type DEFAULT 'info'::notification_type, p_link text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Title cannot be empty';
  END IF;

  IF length(p_title) > 255 THEN
    RAISE EXCEPTION 'Title exceeds maximum length of 255 characters';
  END IF;

  IF p_message IS NOT NULL AND length(p_message) > 1000 THEN
    RAISE EXCEPTION 'Message exceeds maximum length of 1000 characters';
  END IF;

  -- Validate link format if present
  IF p_link IS NOT NULL AND p_link != '' AND p_link NOT LIKE '/%' THEN
    RAISE EXCEPTION 'Link must be a relative path starting with /';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT p.id, p_title, p_message, NULLIF(trim(p_link), '')
  FROM public.profiles p
  WHERE p.is_active = true
    AND p.id != auth.uid();
END;
$function$;

-- Update individual notification RPC to accept optional link
CREATE OR REPLACE FUNCTION public.send_individual_notification(p_user_id uuid, p_title text, p_message text, p_link text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Title cannot be empty';
  END IF;

  -- Validate link format if present
  IF p_link IS NOT NULL AND p_link != '' AND p_link NOT LIKE '/%' THEN
    RAISE EXCEPTION 'Link must be a relative path starting with /';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, link)
  VALUES (p_user_id, p_title, p_message, NULLIF(trim(p_link), ''));
END;
$function$;
