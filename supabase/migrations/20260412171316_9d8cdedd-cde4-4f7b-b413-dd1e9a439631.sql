
CREATE OR REPLACE FUNCTION public.link_environment_members_by_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.environment_members
  SET user_id = NEW.id
  WHERE email = NEW.email
    AND user_id IS NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_link_environment_members
  AFTER INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.link_environment_members_by_email();

-- Also backfill existing members that already have matching profiles
UPDATE public.environment_members em
SET user_id = p.id
FROM public.profiles p
WHERE em.email = p.email
  AND em.user_id IS NULL;
