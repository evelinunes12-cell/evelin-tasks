
-- ============== TABLES ==============
CREATE TABLE public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE public.study_group_role AS ENUM ('admin', 'member');

CREATE TABLE public.study_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.study_group_role NOT NULL DEFAULT 'member',
  share_status BOOLEAN NOT NULL DEFAULT true,
  share_metrics BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX idx_sgm_user ON public.study_group_members(user_id);
CREATE INDEX idx_sgm_group ON public.study_group_members(group_id);

CREATE TABLE public.study_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (length(trim(content)) > 0 AND length(content) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sgmsg_group_created ON public.study_group_messages(group_id, created_at DESC);

-- ============== SECURITY DEFINER HELPER (avoid recursive RLS) ==============
CREATE OR REPLACE FUNCTION public.is_study_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.study_group_members
    WHERE group_id = _group_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_study_group_admin(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.study_group_members
    WHERE group_id = _group_id AND user_id = _user_id AND role = 'admin'
  );
$$;

-- ============== RLS ==============
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_messages ENABLE ROW LEVEL SECURITY;

-- study_groups
CREATE POLICY "Members can view their groups" ON public.study_groups
  FOR SELECT USING (public.is_study_group_member(id, auth.uid()));

CREATE POLICY "Authenticated can create groups" ON public.study_groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update group" ON public.study_groups
  FOR UPDATE USING (public.is_study_group_admin(id, auth.uid()));

CREATE POLICY "Admins can delete group" ON public.study_groups
  FOR DELETE USING (public.is_study_group_admin(id, auth.uid()));

-- study_group_members
CREATE POLICY "Members can view co-members" ON public.study_group_members
  FOR SELECT USING (public.is_study_group_member(group_id, auth.uid()));

-- Self-insert (creator joining their own group) OR admin adding others
CREATE POLICY "Self join or admin add" ON public.study_group_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR public.is_study_group_admin(group_id, auth.uid())
  );

CREATE POLICY "Members can update own privacy" ON public.study_group_members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Self leave or admin remove" ON public.study_group_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR public.is_study_group_admin(group_id, auth.uid())
  );

-- study_group_messages
CREATE POLICY "Members can view messages" ON public.study_group_messages
  FOR SELECT USING (public.is_study_group_member(group_id, auth.uid()));

CREATE POLICY "Members can send messages" ON public.study_group_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND public.is_study_group_member(group_id, auth.uid())
  );

CREATE POLICY "Authors can delete own messages" ON public.study_group_messages
  FOR DELETE USING (auth.uid() = user_id);

-- ============== TRIGGERS ==============
CREATE TRIGGER trg_study_groups_updated
  BEFORE UPDATE ON public.study_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-add creator as admin
CREATE OR REPLACE FUNCTION public.handle_new_study_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.study_group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_study_group
  AFTER INSERT ON public.study_groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_study_group();

-- ============== WEEKLY RANKING RPC ==============
CREATE OR REPLACE FUNCTION public.get_study_group_weekly_ranking(p_group_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  total_minutes BIGINT,
  shares_metrics BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_study_group_member(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    m.user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    COALESCE(SUM(fs.duration_minutes) FILTER (
      WHERE m.share_metrics = true AND fs.created_at >= now() - INTERVAL '7 days'
    ), 0)::BIGINT AS total_minutes,
    m.share_metrics AS shares_metrics
  FROM public.study_group_members m
  JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN public.focus_sessions fs ON fs.user_id = m.user_id
  WHERE m.group_id = p_group_id
  GROUP BY m.user_id, p.full_name, p.username, p.avatar_url, m.share_metrics
  ORDER BY total_minutes DESC;
END;
$$;

-- ============== REALTIME ==============
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_members;

ALTER TABLE public.study_group_messages REPLICA IDENTITY FULL;
ALTER TABLE public.study_group_members REPLICA IDENTITY FULL;
