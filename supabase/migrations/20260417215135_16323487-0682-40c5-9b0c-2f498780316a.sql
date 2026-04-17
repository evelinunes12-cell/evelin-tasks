-- Singleton table holding the current app version metadata
CREATE TABLE public.app_version (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  version TEXT NOT NULL DEFAULT '1.0.0',
  critical BOOLEAN NOT NULL DEFAULT FALSE,
  message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT app_version_singleton CHECK (id = TRUE)
);

-- Seed the singleton row
INSERT INTO public.app_version (id, version, critical, message)
VALUES (TRUE, '1.0.0', FALSE, NULL);

-- Enable RLS
ALTER TABLE public.app_version ENABLE ROW LEVEL SECURITY;

-- Anyone (even anon) can read the version so the update prompt works pre-auth
CREATE POLICY "App version is publicly readable"
ON public.app_version
FOR SELECT
USING (TRUE);

-- Only admins can update
CREATE POLICY "Admins can update app version"
ON public.app_version
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to maintain updated_at and updated_by
CREATE OR REPLACE FUNCTION public.touch_app_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER touch_app_version_trg
BEFORE UPDATE ON public.app_version
FOR EACH ROW
EXECUTE FUNCTION public.touch_app_version();

-- Enable realtime so connected clients get notified instantly when admins bump the version
ALTER TABLE public.app_version REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_version;