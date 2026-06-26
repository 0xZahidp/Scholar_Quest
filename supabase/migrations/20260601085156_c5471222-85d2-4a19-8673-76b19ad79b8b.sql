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