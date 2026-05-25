
-- Sanitize any existing bad data (set non-http(s) link URLs to NULL or remove)
UPDATE public.tasks SET google_docs_link = NULL WHERE google_docs_link IS NOT NULL AND google_docs_link !~* '^https?://';
UPDATE public.tasks SET canva_link = NULL WHERE canva_link IS NOT NULL AND canva_link !~* '^https?://';
UPDATE public.task_steps SET google_docs_link = NULL WHERE google_docs_link IS NOT NULL AND google_docs_link !~* '^https?://';
UPDATE public.task_steps SET canva_link = NULL WHERE canva_link IS NOT NULL AND canva_link !~* '^https?://';
DELETE FROM public.task_attachments WHERE is_link = true AND file_path !~* '^https?://';
DELETE FROM public.task_step_attachments WHERE is_link = true AND file_path !~* '^https?://';

ALTER TABLE public.tasks
  ADD CONSTRAINT chk_tasks_google_docs_link_protocol
  CHECK (google_docs_link IS NULL OR google_docs_link ~* '^https?://');

ALTER TABLE public.tasks
  ADD CONSTRAINT chk_tasks_canva_link_protocol
  CHECK (canva_link IS NULL OR canva_link ~* '^https?://');

ALTER TABLE public.task_steps
  ADD CONSTRAINT chk_task_steps_google_docs_link_protocol
  CHECK (google_docs_link IS NULL OR google_docs_link ~* '^https?://');

ALTER TABLE public.task_steps
  ADD CONSTRAINT chk_task_steps_canva_link_protocol
  CHECK (canva_link IS NULL OR canva_link ~* '^https?://');

ALTER TABLE public.task_attachments
  ADD CONSTRAINT chk_task_attachments_link_protocol
  CHECK (NOT is_link OR file_path ~* '^https?://');

ALTER TABLE public.task_step_attachments
  ADD CONSTRAINT chk_task_step_attachments_link_protocol
  CHECK (NOT is_link OR file_path ~* '^https?://');
