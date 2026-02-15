
ALTER TABLE public.planner_notes
ADD CONSTRAINT planner_notes_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.planner_goals
ADD CONSTRAINT planner_goals_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
