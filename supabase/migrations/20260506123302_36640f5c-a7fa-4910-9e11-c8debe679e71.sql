
-- =============================================
-- 1. Add attachment columns to both chat tables
-- =============================================
ALTER TABLE public.environment_messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size INTEGER,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;

ALTER TABLE public.study_group_messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size INTEGER,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- Relax content check: allow empty content when attachment exists
ALTER TABLE public.environment_messages
  DROP CONSTRAINT IF EXISTS environment_messages_content_check;
ALTER TABLE public.environment_messages
  ADD CONSTRAINT environment_messages_content_check
  CHECK (length(content) <= 2000 AND (length(trim(content)) > 0 OR attachment_url IS NOT NULL));

ALTER TABLE public.study_group_messages
  DROP CONSTRAINT IF EXISTS study_group_messages_content_check;
ALTER TABLE public.study_group_messages
  ADD CONSTRAINT study_group_messages_content_check
  CHECK (length(content) <= 2000 AND (length(trim(content)) > 0 OR attachment_url IS NOT NULL));

-- =============================================
-- 2. Storage bucket for chat attachments (public read for easy preview)
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read (anyone authenticated can fetch via URL; bucket is meant for chat sharing)
DROP POLICY IF EXISTS "Chat attachments are publicly readable" ON storage.objects;
CREATE POLICY "Chat attachments are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-attachments');

-- INSERT: members of the matching environment/group can upload to their path
-- Path format: environments/{environment_id}/{user_id}/{filename}
--          or  groups/{group_id}/{user_id}/{filename}
DROP POLICY IF EXISTS "Members can upload chat attachments" ON storage.objects;
CREATE POLICY "Members can upload chat attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[3]
    AND (
      (
        (storage.foldername(name))[1] = 'environments'
        AND EXISTS (
          SELECT 1 FROM public.shared_environments se
          WHERE se.id::text = (storage.foldername(name))[2]
            AND (se.owner_id = auth.uid() OR public.is_environment_member(se.id, auth.uid()))
        )
      )
      OR (
        (storage.foldername(name))[1] = 'groups'
        AND public.is_study_group_member(((storage.foldername(name))[2])::uuid, auth.uid())
      )
    )
  );

-- DELETE: only the uploader can delete
DROP POLICY IF EXISTS "Users can delete own chat attachments" ON storage.objects;
CREATE POLICY "Users can delete own chat attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[3]
  );

-- =============================================
-- 3. Fix environment chat notification link (was /shared-environments/, route is /environment/)
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_environment_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_env_name TEXT;
  v_owner_id UUID;
  v_sender_name TEXT;
  v_link TEXT;
  v_preview TEXT;
BEGIN
  -- Skip notifications for messages in threads (they have their own context)
  IF NEW.thread_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT environment_name, owner_id
    INTO v_env_name, v_owner_id
  FROM public.shared_environments
  WHERE id = NEW.environment_id;

  SELECT COALESCE(NULLIF(trim(full_name), ''), username, split_part(email, '@', 1))
    INTO v_sender_name
  FROM public.profiles WHERE id = NEW.user_id;

  v_link := '/environment/' || NEW.environment_id;
  v_preview := CASE
    WHEN NEW.attachment_url IS NOT NULL AND length(trim(NEW.content)) = 0 THEN '📎 ' || COALESCE(NEW.attachment_name, 'Anexo')
    WHEN length(NEW.content) > 120 THEN substr(NEW.content, 1, 117) || '...'
    ELSE NEW.content
  END;

  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT DISTINCT recipient_id,
         'Nova mensagem em ' || COALESCE(v_env_name, 'grupo de trabalho') || ' 💬',
         COALESCE(v_sender_name, 'Alguém') || ': ' || v_preview,
         v_link
  FROM (
    SELECT v_owner_id AS recipient_id
    UNION
    SELECT em.user_id FROM public.environment_members em
    WHERE em.environment_id = NEW.environment_id AND em.user_id IS NOT NULL
  ) recipients
  WHERE recipient_id IS NOT NULL
    AND recipient_id <> NEW.user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = recipients.recipient_id
        AND n.link = v_link
        AND n.read = false
        AND n.created_at > now() - interval '5 minutes'
    );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_environment_messages_notifications_read(p_environment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.notifications
  SET read = true
  WHERE user_id = auth.uid()
    AND link IN ('/environment/' || p_environment_id::text, '/shared-environments/' || p_environment_id::text)
    AND read = false;
END;
$$;

-- Update legacy notification links so existing notifications redirect correctly
UPDATE public.notifications
SET link = '/environment/' || substring(link from '/shared-environments/(.*)$')
WHERE link LIKE '/shared-environments/%';
