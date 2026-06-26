
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
