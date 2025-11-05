-- Alterar a coluna due_date para permitir valores NULL na tabela tasks
ALTER TABLE public.tasks 
ALTER COLUMN due_date DROP NOT NULL;