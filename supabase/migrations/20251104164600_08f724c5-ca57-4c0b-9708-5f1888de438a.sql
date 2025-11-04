-- Criar tabela de status de tarefas
CREATE TABLE public.task_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own statuses"
ON public.task_statuses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own statuses"
ON public.task_statuses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own statuses"
ON public.task_statuses
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own statuses"
ON public.task_statuses
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_task_statuses_updated_at
BEFORE UPDATE ON public.task_statuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir status padrão para usuários existentes (opcional, pode ser feito pelo app)
-- Você pode remover esta parte se preferir que cada usuário crie seus próprios status
INSERT INTO public.task_statuses (user_id, name, color)
SELECT DISTINCT user_id, 'Não Iniciado', '#6b7280'
FROM public.tasks
WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.task_statuses (user_id, name, color)
SELECT DISTINCT user_id, 'Em Progresso', '#f59e0b'
FROM public.tasks
WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.task_statuses (user_id, name, color)
SELECT DISTINCT user_id, 'Concluído', '#10b981'
FROM public.tasks
WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;