-- Create task_steps table
CREATE TABLE public.task_steps (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'not_started',
  google_docs_link TEXT,
  canva_link TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create task_step_attachments table
CREATE TABLE public.task_step_attachments (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  task_step_id UUID NOT NULL REFERENCES public.task_steps(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  is_link BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on task_steps
ALTER TABLE public.task_steps ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_steps
CREATE POLICY "Users can view steps of own tasks"
ON public.task_steps
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.tasks
  WHERE tasks.id = task_steps.task_id
  AND tasks.user_id = auth.uid()
));

CREATE POLICY "Users can create steps for own tasks"
ON public.task_steps
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tasks
  WHERE tasks.id = task_steps.task_id
  AND tasks.user_id = auth.uid()
));

CREATE POLICY "Users can update steps of own tasks"
ON public.task_steps
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.tasks
  WHERE tasks.id = task_steps.task_id
  AND tasks.user_id = auth.uid()
));

CREATE POLICY "Users can delete steps of own tasks"
ON public.task_steps
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.tasks
  WHERE tasks.id = task_steps.task_id
  AND tasks.user_id = auth.uid()
));

-- Enable RLS on task_step_attachments
ALTER TABLE public.task_step_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_step_attachments
CREATE POLICY "Users can view attachments of own task steps"
ON public.task_step_attachments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.task_steps
  JOIN public.tasks ON tasks.id = task_steps.task_id
  WHERE task_steps.id = task_step_attachments.task_step_id
  AND tasks.user_id = auth.uid()
));

CREATE POLICY "Users can create attachments for own task steps"
ON public.task_step_attachments
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.task_steps
  JOIN public.tasks ON tasks.id = task_steps.task_id
  WHERE task_steps.id = task_step_attachments.task_step_id
  AND tasks.user_id = auth.uid()
));

CREATE POLICY "Users can delete attachments of own task steps"
ON public.task_step_attachments
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.task_steps
  JOIN public.tasks ON tasks.id = task_steps.task_id
  WHERE task_steps.id = task_step_attachments.task_step_id
  AND tasks.user_id = auth.uid()
));

-- Add trigger for updated_at on task_steps
CREATE TRIGGER update_task_steps_updated_at
BEFORE UPDATE ON public.task_steps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_task_steps_task_id ON public.task_steps(task_id);
CREATE INDEX idx_task_steps_order ON public.task_steps(task_id, order_index);
CREATE INDEX idx_task_step_attachments_step_id ON public.task_step_attachments(task_step_id);