-- Add daily AI Mentor speaking-practice time tracking without resetting app data.

BEGIN;

ALTER TABLE public.mentor_usage_daily
  ADD COLUMN IF NOT EXISTS voice_seconds_used INTEGER NOT NULL DEFAULT 0 CHECK (voice_seconds_used >= 0);

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

COMMIT;
