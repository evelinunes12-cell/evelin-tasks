-- 1. Habilitar a extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- 2. Função que cria notificação quando um membro é adicionado a um ambiente
CREATE OR REPLACE FUNCTION public.handle_new_member_notification()
RETURNS TRIGGER AS $$
DECLARE
  env_name TEXT;
BEGIN
  -- Só cria notificação se o user_id não for NULL
  IF NEW.user_id IS NOT NULL THEN
    -- Busca o nome do ambiente
    SELECT environment_name INTO env_name
    FROM public.shared_environments
    WHERE id = NEW.environment_id;

    -- Insere a notificação
    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (
      NEW.user_id,
      'Novo Ambiente Compartilhado',
      'Você foi adicionado ao grupo: ' || env_name,
      '/environment/' || NEW.environment_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Trigger para novos membros
DROP TRIGGER IF EXISTS on_member_added ON public.environment_members;
CREATE TRIGGER on_member_added
AFTER INSERT ON public.environment_members
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_member_notification();

-- 4. Trigger para quando user_id é vinculado (usuário aceita convite/cadastra)
CREATE OR REPLACE FUNCTION public.handle_member_linked_notification()
RETURNS TRIGGER AS $$
DECLARE
  env_name TEXT;
BEGIN
  -- Se user_id mudou de NULL para um valor
  IF OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT environment_name INTO env_name
    FROM public.shared_environments
    WHERE id = NEW.environment_id;

    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (
      NEW.user_id,
      'Novo Ambiente Compartilhado',
      'Você foi adicionado ao grupo: ' || env_name,
      '/environment/' || NEW.environment_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_member_linked ON public.environment_members;
CREATE TRIGGER on_member_linked
AFTER UPDATE ON public.environment_members
FOR EACH ROW
EXECUTE FUNCTION public.handle_member_linked_notification();

-- 5. Função para verificar tarefas atrasadas
CREATE OR REPLACE FUNCTION public.check_overdue_tasks()
RETURNS void AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT 
    t.user_id,
    'Tarefa Atrasada ⚠️',
    'A tarefa "' || t.subject_name || '" venceu em ' || to_char(t.due_date::date, 'DD/MM'),
    '/task/' || t.id
  FROM public.tasks t
  WHERE 
    t.due_date < current_date
    AND t.status NOT ILIKE '%conclu%'
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n 
      WHERE n.link = '/task/' || t.id 
      AND n.created_at > now() - interval '24 hours'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Função para verificar tarefas que vencem amanhã
CREATE OR REPLACE FUNCTION public.check_upcoming_tasks()
RETURNS void AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT 
    t.user_id,
    'Tarefa Vence Amanhã 📅',
    'A tarefa "' || t.subject_name || '" vence amanhã!',
    '/task/' || t.id
  FROM public.tasks t
  WHERE 
    t.due_date = current_date + 1
    AND t.status NOT ILIKE '%conclu%'
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n 
      WHERE n.link = '/task/' || t.id 
      AND n.title = 'Tarefa Vence Amanhã 📅'
      AND n.created_at > now() - interval '24 hours'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Agendar verificação diária às 09:00 UTC
SELECT cron.schedule('check-overdue-daily', '0 9 * * *', 'SELECT public.check_overdue_tasks()');
SELECT cron.schedule('check-upcoming-daily', '0 9 * * *', 'SELECT public.check_upcoming_tasks()');