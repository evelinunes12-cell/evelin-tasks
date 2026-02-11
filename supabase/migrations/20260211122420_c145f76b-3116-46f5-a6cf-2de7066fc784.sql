CREATE OR REPLACE FUNCTION public.validate_invite(invite_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invite_record RECORD;
  env_name text;
  calling_user_id uuid;
BEGIN
  SELECT * INTO invite_record
  FROM public.invites
  WHERE token = invite_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'not_found');
  END IF;

  IF invite_record.revoked THEN
    RETURN jsonb_build_object('valid', false, 'error', 'revoked');
  END IF;

  IF invite_record.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'expired');
  END IF;

  IF invite_record.max_uses > 0 AND invite_record.uses_count >= invite_record.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'max_uses_reached');
  END IF;

  -- Only reveal environment name to authenticated users
  calling_user_id := auth.uid();

  IF invite_record.type = 'group' AND invite_record.environment_id IS NOT NULL AND calling_user_id IS NOT NULL THEN
    SELECT environment_name INTO env_name FROM public.shared_environments WHERE id = invite_record.environment_id;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'type', invite_record.type,
    'environment_id', CASE WHEN calling_user_id IS NOT NULL THEN invite_record.environment_id ELSE NULL END,
    'environment_name', CASE WHEN calling_user_id IS NOT NULL THEN env_name ELSE NULL END
  );
END;
$function$;