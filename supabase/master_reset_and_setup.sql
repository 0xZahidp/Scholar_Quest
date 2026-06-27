-- Scholar Quest master Supabase reset and setup
-- WARNING: This script is destructive.
-- It deletes Scholar Quest database data, drops app tables/functions/policies, and recreates them.
-- Supabase blocks direct SQL deletion from storage.objects, so storage files must be
-- cleared from the Storage dashboard or through the Storage API.
-- It does NOT delete Supabase Auth users from auth.users.
-- Run this from the Supabase SQL Editor for the current project.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) DESTRUCTIVE RESET: policies, triggers, functions, tables
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.consume_mentor_message(INTEGER);
DROP FUNCTION IF EXISTS public.consume_mentor_voice_seconds(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.reset_user_progress();

DROP TABLE IF EXISTS public.mentor_messages CASCADE;
DROP TABLE IF EXISTS public.mentor_usage_daily CASCADE;
DROP TABLE IF EXISTS public.checklist_items CASCADE;
DROP TABLE IF EXISTS public.professors CASCADE;
DROP TABLE IF EXISTS public.finance_entries CASCADE;
DROP TABLE IF EXISTS public.universities CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.ai_briefings CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.deadlines CASCADE;
DROP TABLE IF EXISTS public.dream_scholarships CASCADE;
DROP TABLE IF EXISTS public.ielts_targets CASCADE;
DROP TABLE IF EXISTS public.ielts_mocks CASCADE;
DROP TABLE IF EXISTS public.daily_tasks CASCADE;
DROP TABLE IF EXISTS public.xp_events CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ---------------------------------------------------------------------------
-- 2) Storage bucket and storage RLS
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO UPDATE
SET name = excluded.name,
    public = excluded.public;

CREATE POLICY "Users can view own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

-- ---------------------------------------------------------------------------
-- 3) App tables
-- ---------------------------------------------------------------------------

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
  current_streak INTEGER DEFAULT 0,
  last_checkin_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  xp_reward INTEGER DEFAULT 50,
  phase TEXT,
  for_date DATE DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE public.dream_scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scholarship_key TEXT NOT NULL,
  status TEXT DEFAULT 'researching',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, scholarship_key)
);

CREATE TABLE public.deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, badge_key)
);

CREATE TABLE public.ai_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  file_url TEXT,
  file_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE TABLE public.finance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  label TEXT NOT NULL,
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.professors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  university TEXT,
  field TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'researching',
  last_contact_on DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo',
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mentor_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_used INTEGER NOT NULL DEFAULT 0 CHECK (messages_used >= 0),
  voice_seconds_used INTEGER NOT NULL DEFAULT 0 CHECK (voice_seconds_used >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date)
);

CREATE TABLE public.mentor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (char_length(content) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4) Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX xp_events_user_idx ON public.xp_events(user_id, created_at DESC);
CREATE INDEX daily_tasks_user_date_idx ON public.daily_tasks(user_id, for_date);
CREATE INDEX ielts_mocks_user_date_idx ON public.ielts_mocks(user_id, taken_on DESC);
CREATE INDEX ai_briefings_user_kind_idx ON public.ai_briefings(user_id, kind, created_at DESC);
CREATE INDEX documents_user_kind_idx ON public.documents(user_id, kind);
CREATE INDEX universities_user_status_idx ON public.universities(user_id, status);
CREATE INDEX finance_entries_user_date_idx ON public.finance_entries(user_id, occurred_on DESC);
CREATE INDEX professors_user_status_idx ON public.professors(user_id, status);
CREATE INDEX checklist_items_user_kind_idx ON public.checklist_items(user_id, kind);
CREATE INDEX mentor_usage_daily_user_date_idx ON public.mentor_usage_daily(user_id, usage_date DESC);
CREATE INDEX mentor_messages_user_created_idx ON public.mentor_messages(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 5) Grants and RLS
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.xp_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ielts_mocks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ielts_targets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dream_scholarships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deadlines TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.achievements TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.ai_briefings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.universities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.mentor_usage_daily TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.mentor_messages TO authenticated;

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.xp_events TO service_role;
GRANT ALL ON public.daily_tasks TO service_role;
GRANT ALL ON public.ielts_mocks TO service_role;
GRANT ALL ON public.ielts_targets TO service_role;
GRANT ALL ON public.dream_scholarships TO service_role;
GRANT ALL ON public.deadlines TO service_role;
GRANT ALL ON public.achievements TO service_role;
GRANT ALL ON public.ai_briefings TO service_role;
GRANT ALL ON public.documents TO service_role;
GRANT ALL ON public.universities TO service_role;
GRANT ALL ON public.finance_entries TO service_role;
GRANT ALL ON public.professors TO service_role;
GRANT ALL ON public.checklist_items TO service_role;
GRANT ALL ON public.mentor_usage_daily TO service_role;
GRANT ALL ON public.mentor_messages TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ielts_mocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ielts_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dream_scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY self_all_profiles ON public.profiles
FOR ALL TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY self_select_xp_events ON public.xp_events
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY self_insert_xp_events ON public.xp_events
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY self_all_daily_tasks ON public.daily_tasks
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY self_all_ielts_mocks ON public.ielts_mocks
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY self_all_ielts_targets ON public.ielts_targets
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY self_all_dream_scholarships ON public.dream_scholarships
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY self_all_deadlines ON public.deadlines
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY self_all_achievements ON public.achievements
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY self_all_ai_briefings ON public.ai_briefings
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY self_all_documents ON public.documents
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY self_all_universities ON public.universities
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY self_all_finance_entries ON public.finance_entries
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY self_all_professors ON public.professors
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY self_all_checklist_items ON public.checklist_items
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY self_select_mentor_usage_daily ON public.mentor_usage_daily
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY self_insert_mentor_usage_daily ON public.mentor_usage_daily
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY self_update_mentor_usage_daily ON public.mentor_usage_daily
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY self_select_mentor_messages ON public.mentor_messages
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY self_insert_mentor_messages ON public.mentor_messages
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY self_delete_mentor_messages ON public.mentor_messages
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6) Functions and signup trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, display_name)
SELECT
  users.id,
  COALESCE(users.raw_user_meta_data->>'display_name', split_part(users.email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

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

CREATE OR REPLACE FUNCTION public.consume_mentor_voice_seconds(
  p_seconds INTEGER,
  p_limit_seconds INTEGER
)
RETURNS TABLE (
  voice_seconds_used INTEGER,
  daily_limit_seconds INTEGER,
  allowed BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_seconds INTEGER := LEAST(GREATEST(p_seconds, 0), 60);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_limit_seconds <= 0 OR v_seconds <= 0 THEN
    RETURN QUERY SELECT 0, p_limit_seconds, false;
    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO public.mentor_usage_daily (user_id, usage_date, voice_seconds_used)
  VALUES (v_user_id, CURRENT_DATE, v_seconds)
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET voice_seconds_used = LEAST(
          public.mentor_usage_daily.voice_seconds_used + v_seconds,
          p_limit_seconds
        ),
        updated_at = now()
    WHERE public.mentor_usage_daily.voice_seconds_used < p_limit_seconds
  RETURNING public.mentor_usage_daily.voice_seconds_used, p_limit_seconds, true;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT public.mentor_usage_daily.voice_seconds_used, p_limit_seconds, false
    FROM public.mentor_usage_daily
    WHERE public.mentor_usage_daily.user_id = v_user_id
      AND public.mentor_usage_daily.usage_date = CURRENT_DATE;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_mentor_voice_seconds(INTEGER, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.reset_user_progress()
RETURNS TABLE (ok BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.ai_briefings WHERE user_id = v_user_id;
  DELETE FROM public.achievements WHERE user_id = v_user_id;
  DELETE FROM public.xp_events WHERE user_id = v_user_id;
  DELETE FROM public.daily_tasks WHERE user_id = v_user_id;
  DELETE FROM public.checklist_items WHERE user_id = v_user_id;
  DELETE FROM public.professors WHERE user_id = v_user_id;
  DELETE FROM public.finance_entries WHERE user_id = v_user_id;
  DELETE FROM public.documents WHERE user_id = v_user_id;
  DELETE FROM public.universities WHERE user_id = v_user_id;
  DELETE FROM public.deadlines WHERE user_id = v_user_id;
  DELETE FROM public.dream_scholarships WHERE user_id = v_user_id;
  DELETE FROM public.ielts_mocks WHERE user_id = v_user_id;
  DELETE FROM public.ielts_targets WHERE user_id = v_user_id;
  DELETE FROM public.mentor_messages WHERE user_id = v_user_id;
  DELETE FROM public.mentor_usage_daily WHERE user_id = v_user_id;

  INSERT INTO public.profiles (id)
  VALUES (v_user_id)
  ON CONFLICT (id) DO UPDATE SET
    target_degree = NULL,
    target_fields = '{}',
    target_countries = '{}',
    has_passport = false,
    ielts_status = 'not_started',
    cv_status = 'not_started',
    budget_saved = 0,
    budget_goal = 0,
    target_departure_date = NULL,
    onboarded = false,
    current_streak = 0,
    last_checkin_date = NULL,
    updated_at = now();

  RETURN QUERY SELECT true;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_user_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_user_progress() TO authenticated;

COMMIT;
