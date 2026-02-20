
-- Tabela de Ciclos de Estudos
CREATE TABLE public.study_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cycles" ON public.study_cycles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own cycles" ON public.study_cycles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cycles" ON public.study_cycles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cycles" ON public.study_cycles FOR DELETE USING (auth.uid() = user_id);

-- Tabela de Blocos do Ciclo
CREATE TABLE public.study_cycle_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.study_cycles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  allocated_minutes INTEGER NOT NULL DEFAULT 30,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.study_cycle_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cycle blocks" ON public.study_cycle_blocks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.study_cycles sc WHERE sc.id = study_cycle_blocks.cycle_id AND sc.user_id = auth.uid()));
CREATE POLICY "Users can create own cycle blocks" ON public.study_cycle_blocks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.study_cycles sc WHERE sc.id = study_cycle_blocks.cycle_id AND sc.user_id = auth.uid()));
CREATE POLICY "Users can update own cycle blocks" ON public.study_cycle_blocks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.study_cycles sc WHERE sc.id = study_cycle_blocks.cycle_id AND sc.user_id = auth.uid()));
CREATE POLICY "Users can delete own cycle blocks" ON public.study_cycle_blocks FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.study_cycles sc WHERE sc.id = study_cycle_blocks.cycle_id AND sc.user_id = auth.uid()));
