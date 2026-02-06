
-- Add a validation trigger on notifications to verify data integrity
-- This provides defense-in-depth beyond the WITH CHECK (false) INSERT policy
CREATE OR REPLACE FUNCTION public.validate_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate that user_id references an existing profile
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'Invalid user_id: no matching profile found';
  END IF;

  -- Validate title is non-empty and within length limits
  IF NEW.title IS NULL OR length(trim(NEW.title)) = 0 THEN
    RAISE EXCEPTION 'Notification title cannot be empty';
  END IF;

  IF length(NEW.title) > 255 THEN
    RAISE EXCEPTION 'Notification title exceeds maximum length of 255 characters';
  END IF;

  -- Validate message length if present
  IF NEW.message IS NOT NULL AND length(NEW.message) > 1000 THEN
    RAISE EXCEPTION 'Notification message exceeds maximum length of 1000 characters';
  END IF;

  -- Validate link format if present (must be a relative path starting with /)
  IF NEW.link IS NOT NULL AND NEW.link NOT LIKE '/%' THEN
    RAISE EXCEPTION 'Notification link must be a relative path starting with /';
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER validate_notification_before_insert
BEFORE INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.validate_notification();
