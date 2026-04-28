-- =============================================
-- Chat de mensagens dentro de Grupos de Trabalho (shared_environments)
-- =============================================

CREATE TABLE IF NOT EXISTS public.environment_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id UUID NOT NULL REFERENCES public.shared_environments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (length(trim(content)) > 0 AND length(content) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_envmsg_environment_created
  ON public.environment_messages(environment_id, created_at DESC);

ALTER TABLE public.environment_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Quem pode ver/enviar é o owner ou um membro do environment
CREATE POLICY "Members or owner can view environment messages"
  ON public.environment_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_environments se
      WHERE se.id = environment_messages.environment_id
        AND (se.owner_id = auth.uid() OR public.is_environment_member(se.id, auth.uid()))
    )
  );

CREATE POLICY "Members or owner can send environment messages"
  ON public.environment_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.shared_environments se
      WHERE se.id = environment_messages.environment_id
        AND (se.owner_id = auth.uid() OR public.is_environment_member(se.id, auth.uid()))
    )
  );

CREATE POLICY "Authors can delete their own environment messages"
  ON public.environment_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.environment_messages;
ALTER TABLE public.environment_messages REPLICA IDENTITY FULL;

-- =============================================
-- Trigger: notificar membros sobre nova mensagem
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
  SELECT environment_name, owner_id
    INTO v_env_name, v_owner_id
  FROM public.shared_environments
  WHERE id = NEW.environment_id;

  SELECT COALESCE(NULLIF(trim(full_name), ''), username, split_part(email, '@', 1))
    INTO v_sender_name
  FROM public.profiles WHERE id = NEW.user_id;

  v_link := '/shared-environments/' || NEW.environment_id;
  v_preview := CASE
    WHEN length(NEW.content) > 120 THEN substr(NEW.content, 1, 117) || '...'
    ELSE NEW.content
  END;

  -- Notify all environment members + owner, except the sender. De-dupe in last 5 minutes.
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

DROP TRIGGER IF EXISTS trg_new_environment_message_notification
  ON public.environment_messages;

CREATE TRIGGER trg_new_environment_message_notification
  AFTER INSERT ON public.environment_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_environment_message_notification();

-- =============================================
-- Helper: marcar todas notificações de chat do ambiente como lidas
-- =============================================
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
    AND link = '/shared-environments/' || p_environment_id::text
    AND read = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_environment_messages_notifications_read(uuid) TO authenticated;