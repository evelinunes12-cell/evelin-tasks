-- Garantia de username temporário para TODAS as contas já existentes.
-- Mantém usernames válidos atuais e corrige apenas registros sem username/username inválido.
DO $$
DECLARE
  profile_row RECORD;
BEGIN
  FOR profile_row IN
    SELECT id, full_name, email
    FROM public.profiles
    WHERE username IS NULL
      OR username !~ '^[a-z0-9_]{3,20}$'
  LOOP
    UPDATE public.profiles
    SET
      username = public.generate_unique_username(
        COALESCE(profile_row.full_name, split_part(profile_row.email, '@', 1), 'user')
      ),
      last_username_update = COALESCE(last_username_update, NOW())
    WHERE id = profile_row.id;
  END LOOP;
END;
$$;

-- Segurança extra: se por qualquer motivo houver username vazio (ex: migração manual), corrige também.
UPDATE public.profiles p
SET
  username = public.generate_unique_username(
    COALESCE(p.full_name, split_part(p.email, '@', 1), 'user')
  ),
  last_username_update = COALESCE(p.last_username_update, NOW())
WHERE p.username = '';
