-- Normalize study group name: trim + collapse internal whitespace, keep case
CREATE OR REPLACE FUNCTION public.normalize_study_group_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.name := regexp_replace(btrim(NEW.name), '\s+', ' ', 'g');
  END IF;
  IF NEW.name IS NULL OR length(NEW.name) = 0 THEN
    RAISE EXCEPTION 'Group name cannot be empty';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_study_group_name ON public.study_groups;
CREATE TRIGGER trg_normalize_study_group_name
  BEFORE INSERT OR UPDATE OF name ON public.study_groups
  FOR EACH ROW EXECUTE FUNCTION public.normalize_study_group_name();

-- Backfill existing rows so the unique index reflects normalized values
UPDATE public.study_groups
SET name = regexp_replace(btrim(name), '\s+', ' ', 'g')
WHERE name IS DISTINCT FROM regexp_replace(btrim(name), '\s+', ' ', 'g');