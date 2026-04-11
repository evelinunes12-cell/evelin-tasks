CREATE OR REPLACE FUNCTION public.log_environment_member_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- If the inserting user is the same as the new member's user_id, it's a self-join (invite accepted)
    IF NEW.user_id IS NOT NULL AND NEW.user_id = auth.uid() THEN
      INSERT INTO public.environment_activity_log (environment_id, user_id, action, entity_type, entity_id, entity_name, details)
      VALUES (NEW.environment_id, auth.uid(), 'member_joined', 'member', NEW.id, NEW.email, NULL);
    ELSE
      INSERT INTO public.environment_activity_log (environment_id, user_id, action, entity_type, entity_id, entity_name, details)
      VALUES (NEW.environment_id, auth.uid(), 'member_added', 'member', NEW.id, NEW.email, NULL);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- If the user is deleting their own row, it's a "left" action
    IF OLD.user_id = auth.uid() THEN
      INSERT INTO public.environment_activity_log (environment_id, user_id, action, entity_type, entity_id, entity_name, details)
      VALUES (OLD.environment_id, auth.uid(), 'member_left', 'member', OLD.id, OLD.email, NULL);
    ELSE
      INSERT INTO public.environment_activity_log (environment_id, user_id, action, entity_type, entity_id, entity_name, details)
      VALUES (OLD.environment_id, auth.uid(), 'member_removed', 'member', OLD.id, OLD.email, NULL);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect member being linked (user_id was null, now set) = member joined via link
    IF OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
      INSERT INTO public.environment_activity_log (environment_id, user_id, action, entity_type, entity_id, entity_name, details)
      VALUES (NEW.environment_id, NEW.user_id, 'member_joined', 'member', NEW.id, NEW.email, NULL);
    ELSIF OLD.permissions IS DISTINCT FROM NEW.permissions THEN
      INSERT INTO public.environment_activity_log (environment_id, user_id, action, entity_type, entity_id, entity_name, details)
      VALUES (NEW.environment_id, auth.uid(), 'permissions_changed', 'member', NEW.id, NEW.email,
              'Permissões atualizadas');
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;