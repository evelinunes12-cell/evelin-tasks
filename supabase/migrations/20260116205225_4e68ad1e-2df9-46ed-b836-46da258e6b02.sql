-- Adiciona contador de sessões de Pomodoro
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pomodoro_sessions INTEGER DEFAULT 0;