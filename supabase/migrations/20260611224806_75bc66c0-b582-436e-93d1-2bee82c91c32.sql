-- Add permissions column to invites for group invite links
ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS permissions environment_permission[] NOT NULL DEFAULT ARRAY['view'::environment_permission];

-- Update consume_invite to apply the invite's configured permissions to new members
CREATE OR REPLACE FUNCTION public.consume_invite(invite_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invite_record RECORD;
  current_user_id uuid;
  current_user_email text;
  pending_member_id uuid;
  active_member_exists boolean;
  invite_permissions environment_permission[];
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO invite_record FROM public.invites WHERE token = invite_token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF invite_record.revoked THEN
    RETURN jsonb_build_object('success', false, 'error', 'revoked');
  END IF;

  IF invite_record.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;

  IF invite_record.max_uses > 0 AND invite_record.uses_count >= invite_record.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'max_uses_reached');
  END IF;

  IF EXISTS (SELECT 1 FROM public.invite_uses WHERE invite_id = invite_record.id AND used_by = current_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_used');
  END IF;

  SELECT email INTO current_user_email FROM public.profiles WHERE id = current_user_id;

  -- Ensure 'view' is always included
  invite_permissions := invite_record.permissions;
  IF invite_permissions IS NULL OR array_length(invite_permissions, 1) IS NULL THEN
    invite_permissions := ARRAY['view'::environment_permission];
  ELSIF NOT ('view'::environment_permission = ANY(invite_permissions)) THEN
    invite_permissions := array_append(invite_permissions, 'view'::environment_permission);
  END IF;

  IF invite_record.type = 'group' THEN
    IF EXISTS (SELECT 1 FROM public.shared_environments WHERE id = invite_record.environment_id AND owner_id = current_user_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_owner');
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.environment_members
      WHERE environment_id = invite_record.environment_id
        AND user_id = current_user_id
    ) INTO active_member_exists;

    IF active_member_exists THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_member');
    END IF;

    SELECT id INTO pending_member_id
    FROM public.environment_members
    WHERE environment_id = invite_record.environment_id
      AND user_id IS NULL
      AND lower(email) = lower(current_user_email)
    LIMIT 1;

    IF pending_member_id IS NOT NULL THEN
      UPDATE public.environment_members
      SET user_id = current_user_id,
          email = current_user_email,
          permissions = invite_permissions
      WHERE id = pending_member_id;
    ELSE
      INSERT INTO public.environment_members (environment_id, email, user_id, permissions)
      VALUES (invite_record.environment_id, current_user_email, current_user_id, invite_permissions);
    END IF;
  END IF;

  INSERT INTO public.invite_uses (invite_id, used_by) VALUES (invite_record.id, current_user_id);
  UPDATE public.invites SET uses_count = uses_count + 1 WHERE id = invite_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'type', invite_record.type,
    'environment_id', invite_record.environment_id
  );
END;
$function$;