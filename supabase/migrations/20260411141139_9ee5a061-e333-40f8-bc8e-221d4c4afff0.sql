
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  tasks_system boolean NOT NULL DEFAULT true,
  tasks_push boolean NOT NULL DEFAULT true,
  schedules_system boolean NOT NULL DEFAULT true,
  schedules_push boolean NOT NULL DEFAULT true,
  goals_system boolean NOT NULL DEFAULT true,
  goals_push boolean NOT NULL DEFAULT true,
  notes_system boolean NOT NULL DEFAULT true,
  notes_push boolean NOT NULL DEFAULT true,
  study_cycle_system boolean NOT NULL DEFAULT true,
  study_cycle_push boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-create preferences row for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_notification_prefs
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_notification_preferences();
