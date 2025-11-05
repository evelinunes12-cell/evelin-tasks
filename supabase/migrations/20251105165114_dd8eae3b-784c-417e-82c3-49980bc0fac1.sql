-- Remover a constraint CHECK antiga que limitava os valores de status em inglês
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_status_check;