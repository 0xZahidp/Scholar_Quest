-- Consolidated Supabase SQL migration script for Scholar Quest
-- This file includes all SQL statements from the repository's Supabase migrations.

-- migration: 20260601081721_81a2686e-decc-4ca9-87c8-5ed35cd35a10.sql

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  country TEXT,
  target_degree TEXT,
  target_fields TEXT[] DEFAULT '{}',
  target_countries TEXT[] DEFAULT '{}',
  has_passport BOOLEAN DEFAULT false,
  ielts_status TEXT DEFAULT 'not_started',
  cv_status TEXT DEFAULT 'not_started',
  budget_saved NUMERIC DEFAULT 0,
  budget_goal NUMERIC DEFAULT 0,
  target_departure_date DATE,
  onboarded BOOLEAN DEFAULT false,
  current_streak INT DEFAULT 0,
  last_checkin_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self_select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- XP EVENTS
CREATE TABLE public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX xp_events_user_idx ON public.xp_events(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.xp_events TO authenticated;
GRANT ALL ON public.xp_events TO service_role;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self_select_xp" ON public.xp_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "self_insert_xp" ON public.xp_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- DAILY TASKS
CREATE TABLE public.daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  xp_reward INT DEFAULT 50,
  phase TEXT,
  for_date DATE DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX daily_tasks_user_date_idx ON public.daily_tasks(user_id, for_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_tasks TO authenticated;
GRANT ALL ON public.daily_tasks TO service_role;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self_all_tasks" ON public.daily_tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- IELTS MOCKS
CREATE TABLE public.ielts_mocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  taken_on DATE NOT NULL DEFAULT CURRENT_DATE,
  listening NUMERIC(2,1),
  reading NUMERIC(2,1),
  writing NUMERIC(2,1),
  speaking NUMERIC(2,1),
  overall NUMERIC(2,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ielts_mocks_user_date_idx ON public.ielts_mocks(user_id, taken_on DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ielts_mocks TO authenticated;
GRANT ALL ON public.ielts_mocks TO service_role;
ALTER TABLE public.ielts_mocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self_all_mocks" ON public.ielts_mocks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- IELTS TARGETS
CREATE TABLE public.ielts_targets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  target_listening NUMERIC(2,1) DEFAULT 7.0,
  target_reading NUMERIC(2,1) DEFAULT 7.0,
  target_writing NUMERIC(2,1) DEFAULT 7.0,
  target_speaking NUMERIC(2,1) DEFAULT 7.0,
  target_overall NUMERIC(2,1) DEFAULT 7.0,
  exam_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ielts_targets TO authenticated;
GRANT ALL ON public.ielts_targets TO service_role;
ALTER TABLE public.ielts_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self_all_targets" ON public.ielts_targets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DREAM SCHOLARSHIPS
CREATE TABLE public.dream_scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scholarship_key TEXT NOT NULL,
  status TEXT DEFAULT 'researching',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, scholarship_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dream_scholarships TO authenticated;
GRANT ALL ON public.dream_scholarships TO service_role;
ALTER TABLE public.dream_scholarships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self_all_dreams" ON public.dream_scholarships FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DEADLINES
CREATE TABLE public.deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deadlines TO authenticated;
GRANT ALL ON public.deadlines TO service_role;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self_all_deadlines" ON public.deadlines FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ACHIEVEMENTS
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_key)
);
GRANT SELECT, INSERT, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self_all_ach" ON public.achievements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- MISSION BRIEFINGS
CREATE TABLE public.ai_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ai_briefings_user_kind_idx ON public.ai_briefings(user_id, kind, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.ai_briefings TO authenticated;
GRANT ALL ON public.ai_briefings TO service_role;
ALTER TABLE public.ai_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self_all_briefings" ON public.ai_briefings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- migration: 20260601081745_bc04a8d5-3980-48a7-a435-6ee39fe9fc1e.sql

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- migration: 20260601085156_c5471222-85d2-4a19-8673-76b19ad79b8b.sql

DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- migration: 20260602022438_e0538817-e4e7-4b80-aaa1-e13f5609c8ee.sql

-- Documents tracker
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY self_all_documents ON public.documents FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- University shortlist
CREATE TABLE public.universities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  country TEXT,
  program TEXT,
  status TEXT NOT NULL DEFAULT 'researching',
  deadline DATE,
  tuition_usd NUMERIC,
  ranking INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.universities TO authenticated;
GRANT ALL ON public.universities TO service_role;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
CREATE POLICY self_all_universities ON public.universities FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Finance ledger
CREATE TABLE public.finance_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  label TEXT NOT NULL,
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_entries TO authenticated;
GRANT ALL ON public.finance_entries TO service_role;
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY self_all_finance ON public.finance_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- migration: 20260606025743_f9ef8429-aaaa-4423-9c33-4dfc8ad8dbfd.sql

CREATE TABLE public.professors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  university text,
  field text,
  email text,
  status text NOT NULL DEFAULT 'researching',
  last_contact_on date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professors TO authenticated;
GRANT ALL ON public.professors TO service_role;
ALTER TABLE public.professors ENABLE ROW LEVEL SECURITY;
CREATE POLICY self_all_professors ON public.professors FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'todo',
  due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items TO authenticated;
GRANT ALL ON public.checklist_items TO service_role;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY self_all_checklist ON public.checklist_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_checklist_user_kind ON public.checklist_items(user_id, kind);

-- migration: 20260606030509_2c4fbbda-a264-44b9-a0b8-667c5ea6c02b.sql

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_path TEXT;

-- migration: 20260626053642_bca5db08-c8f1-4369-9c90-811ee38904a5.sql

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_path TEXT;

-- migration: 20260626090000_add_mentor_usage_daily.sql

CREATE TABLE IF NOT EXISTS public.mentor_usage_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_used INTEGER NOT NULL DEFAULT 0 CHECK (messages_used >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date)
);

GRANT SELECT, INSERT, UPDATE ON public.mentor_usage_daily TO authenticated;
GRANT ALL ON public.mentor_usage_daily TO service_role;

ALTER TABLE public.mentor_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY self_select_mentor_usage_daily
  ON public.mentor_usage_daily
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY self_insert_mentor_usage_daily
  ON public.mentor_usage_daily
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY self_update_mentor_usage_daily
  ON public.mentor_usage_daily
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.consume_mentor_message(p_limit INTEGER)
RETURNS TABLE (
  messages_used INTEGER,
  daily_limit INTEGER,
  allowed BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_limit <= 0 THEN
    RETURN QUERY SELECT 0, p_limit, false;
    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO public.mentor_usage_daily (user_id, usage_date, messages_used)
  VALUES (v_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET messages_used = public.mentor_usage_daily.messages_used + 1,
        updated_at = now()
    WHERE public.mentor_usage_daily.messages_used < p_limit
  RETURNING public.mentor_usage_daily.messages_used, p_limit, true;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT public.mentor_usage_daily.messages_used, p_limit, false
    FROM public.mentor_usage_daily
    WHERE public.mentor_usage_daily.user_id = v_user_id
      AND public.mentor_usage_daily.usage_date = CURRENT_DATE;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_mentor_message(INTEGER) TO authenticated;
