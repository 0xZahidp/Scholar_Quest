-- Add persistent AI Mentor chat history without resetting app data.
-- Run once in the Supabase SQL editor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.mentor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (char_length(content) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mentor_messages_user_created_idx
  ON public.mentor_messages(user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.mentor_messages TO authenticated;
GRANT ALL ON public.mentor_messages TO service_role;

ALTER TABLE public.mentor_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS self_select_mentor_messages ON public.mentor_messages;
CREATE POLICY self_select_mentor_messages
ON public.mentor_messages
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS self_insert_mentor_messages ON public.mentor_messages;
CREATE POLICY self_insert_mentor_messages
ON public.mentor_messages
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS self_delete_mentor_messages ON public.mentor_messages;
CREATE POLICY self_delete_mentor_messages
ON public.mentor_messages
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

COMMIT;
