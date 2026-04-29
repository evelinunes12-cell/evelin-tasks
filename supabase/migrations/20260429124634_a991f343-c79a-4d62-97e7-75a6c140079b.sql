-- 1) Atualizar consume_invite para reconciliar convites pendentes (user_id NULL pelo email)
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

  IF invite_record.type = 'group' THEN
    IF EXISTS (SELECT 1 FROM public.shared_environments WHERE id = invite_record.environment_id AND owner_id = current_user_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_owner');
    END IF;

    -- Já é membro com user_id preenchido?
    SELECT EXISTS (
      SELECT 1 FROM public.environment_members
      WHERE environment_id = invite_record.environment_id
        AND user_id = current_user_id
    ) INTO active_member_exists;

    IF active_member_exists THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_member');
    END IF;

    -- Existe linha pendente pelo email? Reconciliar.
    SELECT id INTO pending_member_id
    FROM public.environment_members
    WHERE environment_id = invite_record.environment_id
      AND user_id IS NULL
      AND lower(email) = lower(current_user_email)
    LIMIT 1;

    IF pending_member_id IS NOT NULL THEN
      UPDATE public.environment_members
      SET user_id = current_user_id,
          email = current_user_email
      WHERE id = pending_member_id;
    ELSE
      INSERT INTO public.environment_members (environment_id, email, user_id, permissions)
      VALUES (invite_record.environment_id, current_user_email, current_user_id, ARRAY['view'::environment_permission]);
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

-- 2) Reconciliação automática quando um profile é criado/atualizado:
-- vincula linhas de environment_members com user_id NULL e email correspondente
CREATE OR REPLACE FUNCTION public.reconcile_environment_members_on_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.environment_members em
    SET user_id = NEW.id
    WHERE em.user_id IS NULL
      AND lower(em.email) = lower(NEW.email)
      -- evita duplicar se já houver linha com user_id preenchido para o mesmo ambiente
      AND NOT EXISTS (
        SELECT 1 FROM public.environment_members em2
        WHERE em2.environment_id = em.environment_id
          AND em2.user_id = NEW.id
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reconcile_env_members_on_profile_ins ON public.profiles;
DROP TRIGGER IF EXISTS trg_reconcile_env_members_on_profile_upd ON public.profiles;

CREATE TRIGGER trg_reconcile_env_members_on_profile_ins
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.reconcile_environment_members_on_profile();

CREATE TRIGGER trg_reconcile_env_members_on_profile_upd
AFTER UPDATE OF email ON public.profiles
FOR EACH ROW
WHEN (NEW.email IS DISTINCT FROM OLD.email)
EXECUTE FUNCTION public.reconcile_environment_members_on_profile();

-- 3) Backfill: vincula todos os membros pendentes que já têm profile correspondente
UPDATE public.environment_members em
SET user_id = p.id
FROM public.profiles p
WHERE em.user_id IS NULL
  AND lower(em.email) = lower(p.email)
  AND NOT EXISTS (
    SELECT 1 FROM public.environment_members em2
    WHERE em2.environment_id = em.environment_id
      AND em2.user_id = p.id
  );

-- Remove duplicatas (caso existam: linha com user_id + linha pendente mesmo email/ambiente)
DELETE FROM public.environment_members em
WHERE em.user_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.environment_members em2
    JOIN public.profiles p ON p.id = em2.user_id
    WHERE em2.environment_id = em.environment_id
      AND lower(p.email) = lower(em.email)
  );