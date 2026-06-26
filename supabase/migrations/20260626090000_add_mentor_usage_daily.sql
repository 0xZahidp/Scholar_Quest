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
