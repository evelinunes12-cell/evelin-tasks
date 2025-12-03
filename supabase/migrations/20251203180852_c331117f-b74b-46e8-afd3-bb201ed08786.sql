-- Create a security definer function to check if user is a member of an environment
CREATE OR REPLACE FUNCTION public.is_environment_member(_environment_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.environment_members em
    WHERE em.environment_id = _environment_id 
    AND (em.user_id = _user_id OR em.email = (SELECT email FROM public.profiles WHERE id = _user_id))
  );
$$;

-- Update the SELECT policy on shared_environments to allow members to view
DROP POLICY IF EXISTS "Users can view environments they own or are members of" ON shared_environments;
CREATE POLICY "Users can view environments they own or are members of" 
ON shared_environments
FOR SELECT
USING (
  auth.uid() = owner_id 
  OR public.is_environment_member(id, auth.uid())
);

-- Update environment_members SELECT policy to allow members to see other members
DROP POLICY IF EXISTS "Users can view members of environments they have access to" ON environment_members;
CREATE POLICY "Users can view members of environments they have access to"
ON environment_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM shared_environments se
    WHERE se.id = environment_members.environment_id 
    AND (se.owner_id = auth.uid() OR public.is_environment_member(se.id, auth.uid()))
  )
);

-- Create a trigger to automatically link user_id when a user signs up with an email that exists in environment_members
CREATE OR REPLACE FUNCTION public.link_environment_member_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.environment_members
  SET user_id = NEW.id
  WHERE email = NEW.email AND user_id IS NULL;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table (which is populated on user signup)
DROP TRIGGER IF EXISTS on_profile_created_link_environment ON public.profiles;
CREATE TRIGGER on_profile_created_link_environment
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.link_environment_member_on_signup();