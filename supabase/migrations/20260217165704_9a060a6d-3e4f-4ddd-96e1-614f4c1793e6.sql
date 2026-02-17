
-- Table: achievements (master list)
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Flame',
  required_value INTEGER NOT NULL,
  gradient_from TEXT NOT NULL DEFAULT '262 83% 58%',
  gradient_to TEXT NOT NULL DEFAULT '220 70% 50%',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view achievements"
  ON public.achievements FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Table: user_achievements (unlocked)
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unlocked achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Seed the 9 achievements
INSERT INTO public.achievements (title, description, icon, required_value, gradient_from, gradient_to) VALUES
  ('Faísca Inicial', 'Manteve 5 dias seguidos de foco', 'Zap', 5, '45 93% 47%', '38 92% 50%'),
  ('Motor Aquecido', 'Manteve 10 dias seguidos de foco', 'Flame', 10, '15 80% 50%', '0 84% 60%'),
  ('Decolagem', 'Manteve 15 dias seguidos de foco', 'Rocket', 15, '200 80% 50%', '220 70% 50%'),
  ('Hábito de Ferro', 'Manteve 30 dias seguidos de foco', 'Shield', 30, '215 28% 40%', '224 71% 30%'),
  ('Escalador', 'Manteve 45 dias seguidos de foco', 'Mountain', 45, '142 76% 36%', '160 84% 39%'),
  ('Mente Blindada', 'Manteve 60 dias seguidos de foco', 'Brain', 60, '262 83% 58%', '280 70% 50%'),
  ('Mestre da Disciplina', 'Manteve 75 dias seguidos de foco', 'Sword', 75, '262 83% 58%', '200 80% 50%'),
  ('Indestrutível', 'Manteve 85 dias seguidos de foco', 'Diamond', 85, '190 90% 50%', '210 80% 60%'),
  ('Lenda do Zenit', 'Manteve 100 dias seguidos de foco', 'Crown', 100, '45 93% 47%', '30 80% 50%');
