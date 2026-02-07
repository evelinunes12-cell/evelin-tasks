
-- Create invites table for link-based invitations
CREATE TABLE public.invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  type text NOT NULL CHECK (type IN ('group', 'signup')),
  environment_id uuid REFERENCES public.shared_environments(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  max_uses integer DEFAULT 1,
  uses_count integer NOT NULL DEFAULT 0,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Ensure group invites have an environment_id
  CONSTRAINT group_invite_needs_environment CHECK (
    (type = 'signup') OR (type = 'group' AND environment_id IS NOT NULL)
  )
);

-- Create invite_uses table for audit trail
CREATE TABLE public.invite_uses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_id uuid NOT NULL REFERENCES public.invites(id) ON DELETE CASCADE,
  used_by uuid NOT NULL,
  used_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_invites_token ON public.invites(token);
CREATE INDEX idx_invites_environment_id ON public.invites(environment_id);
CREATE INDEX idx_invites_created_by ON public.invites(created_by);
CREATE INDEX idx_invite_uses_invite_id ON public.invite_uses(invite_id);

-- Enable RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_uses ENABLE ROW LEVEL SECURITY;

-- RLS policies for invites
-- Owners of the environment can manage invites
CREATE POLICY "Environment owners can create group invites"
ON public.invites
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND (
    type = 'signup' OR
    (type = 'group' AND EXISTS (
      SELECT 1 FROM public.shared_environments se
      WHERE se.id = invites.environment_id AND se.owner_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can view invites they created"
ON public.invites
FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can update invites they created"
ON public.invites
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete invites they created"
ON public.invites
FOR DELETE
USING (auth.uid() = created_by);

-- RLS policies for invite_uses (audit trail)
CREATE POLICY "Invite creators can view usage"
ON public.invite_uses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invites i
    WHERE i.id = invite_uses.invite_id AND i.created_by = auth.uid()
  )
);

CREATE POLICY "Authenticated users can record invite usage"
ON public.invite_uses
FOR INSERT
WITH CHECK (auth.uid() = used_by);

-- Function to consume an invite (called from client after validation)
CREATE OR REPLACE FUNCTION public.consume_invite(invite_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invite_record RECORD;
  result jsonb;
  current_user_id uuid;
  current_user_email text;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Get the invite
  SELECT * INTO invite_record
  FROM public.invites
  WHERE token = invite_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  -- Check if revoked
  IF invite_record.revoked THEN
    RETURN jsonb_build_object('success', false, 'error', 'revoked');
  END IF;

  -- Check if expired
  IF invite_record.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;

  -- Check max uses (0 = unlimited)
  IF invite_record.max_uses > 0 AND invite_record.uses_count >= invite_record.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'max_uses_reached');
  END IF;

  -- Check if user already used this invite
  IF EXISTS (SELECT 1 FROM public.invite_uses WHERE invite_id = invite_record.id AND used_by = current_user_id) THEN
    -- If it's a group invite, check if already a member
    IF invite_record.type = 'group' THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_used');
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'already_used');
  END IF;

  -- Get user email
  SELECT email INTO current_user_email FROM public.profiles WHERE id = current_user_id;

  -- Process based on type
  IF invite_record.type = 'group' THEN
    -- Check if user is already the owner
    IF EXISTS (SELECT 1 FROM public.shared_environments WHERE id = invite_record.environment_id AND owner_id = current_user_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_owner');
    END IF;

    -- Check if user is already a member
    IF EXISTS (
      SELECT 1 FROM public.environment_members 
      WHERE environment_id = invite_record.environment_id 
      AND (user_id = current_user_id OR email = current_user_email)
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_member');
    END IF;

    -- Add user as member with view permission
    INSERT INTO public.environment_members (environment_id, email, user_id, permissions)
    VALUES (invite_record.environment_id, current_user_email, current_user_id, ARRAY['view'::environment_permission]);
  END IF;

  -- Record usage
  INSERT INTO public.invite_uses (invite_id, used_by) VALUES (invite_record.id, current_user_id);

  -- Increment uses_count
  UPDATE public.invites SET uses_count = uses_count + 1 WHERE id = invite_record.id;

  RETURN jsonb_build_object(
    'success', true, 
    'type', invite_record.type,
    'environment_id', invite_record.environment_id
  );
END;
$$;

-- Function to validate invite without consuming it (can be called by anyone, even unauthenticated)
CREATE OR REPLACE FUNCTION public.validate_invite(invite_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invite_record RECORD;
  env_name text;
BEGIN
  SELECT * INTO invite_record
  FROM public.invites
  WHERE token = invite_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'not_found');
  END IF;

  IF invite_record.revoked THEN
    RETURN jsonb_build_object('valid', false, 'error', 'revoked');
  END IF;

  IF invite_record.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'expired');
  END IF;

  IF invite_record.max_uses > 0 AND invite_record.uses_count >= invite_record.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'max_uses_reached');
  END IF;

  -- Get environment name if group invite
  IF invite_record.type = 'group' AND invite_record.environment_id IS NOT NULL THEN
    SELECT environment_name INTO env_name FROM public.shared_environments WHERE id = invite_record.environment_id;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'type', invite_record.type,
    'environment_id', invite_record.environment_id,
    'environment_name', env_name
  );
END;
$$;
