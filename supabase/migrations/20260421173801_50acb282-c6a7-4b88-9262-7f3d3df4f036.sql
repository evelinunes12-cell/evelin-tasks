-- Prevent duplicate study group names per creator (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS study_groups_unique_name_per_creator
  ON public.study_groups (created_by, lower(name));