-- 1. Remover políticas duplicadas/antigas
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON public.profiles;

-- 2. Criar políticas básicas para o próprio perfil
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile" 
ON public.profiles FOR DELETE 
USING (auth.uid() = id);

-- 3. Política para ver colegas de grupo (mesmo ambiente)
CREATE POLICY "Users can view profiles of group members" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.environment_members my_membership
    JOIN public.environment_members their_membership 
      ON my_membership.environment_id = their_membership.environment_id
    WHERE my_membership.user_id = auth.uid()
    AND their_membership.user_id = profiles.id
  )
);

-- 4. Função segura para buscar ID pelo email (para convites)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email_input TEXT)
RETURNS UUID AS $$
DECLARE
  found_id UUID;
BEGIN
  SELECT id INTO found_id
  FROM public.profiles
  WHERE email = email_input;
  
  RETURN found_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;