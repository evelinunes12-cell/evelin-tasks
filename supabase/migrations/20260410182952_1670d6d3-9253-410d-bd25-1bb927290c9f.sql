
-- Allow members to delete their own membership row (leave group)
CREATE POLICY "Members can leave group"
ON public.environment_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Update the log function to distinguish self-removal (leave) from owner removal
CREATE OR REPLACE FUNCTION public.log_environment_member_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.environment_activity_log (environment_id, user_id, action, entity_type, entity_id, entity_name, details)
    VALUES (NEW.environment_id, auth.uid(), 'member_added', 'member', NEW.id, NEW.email, NULL);
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
    -- Detect member being linked (user_id was null, now set) = member joined
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
