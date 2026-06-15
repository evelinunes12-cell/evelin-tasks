ALTER TABLE public.system_banners
  ADD COLUMN IF NOT EXISTS image_url_mobile TEXT,
  ADD COLUMN IF NOT EXISTS image_url_tablet TEXT;