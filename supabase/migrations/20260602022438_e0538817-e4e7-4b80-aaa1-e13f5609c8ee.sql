
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
