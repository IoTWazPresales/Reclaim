-- Phase 2: Extend mindfulness_events for Health Connect sessions (Reclaim + HC in one table).
-- Run this migration so upsertMindfulnessSessionFromHealth and listMindfulnessSessions work.

-- Add columns (nullable so existing rows stay valid)
ALTER TABLE public.mindfulness_events ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'reclaim';
ALTER TABLE public.mindfulness_events ADD COLUMN IF NOT EXISTS start_time timestamptz NULL;
ALTER TABLE public.mindfulness_events ADD COLUMN IF NOT EXISTS end_time timestamptz NULL;
ALTER TABLE public.mindfulness_events ADD COLUMN IF NOT EXISTS duration_sec integer NULL;
ALTER TABLE public.mindfulness_events ADD COLUMN IF NOT EXISTS session_type text NULL;
ALTER TABLE public.mindfulness_events ADD COLUMN IF NOT EXISTS title text NULL;
ALTER TABLE public.mindfulness_events ADD COLUMN IF NOT EXISTS notes text NULL;
ALTER TABLE public.mindfulness_events ADD COLUMN IF NOT EXISTS external_id text NULL;

-- Dedupe HC sessions: one row per (user_id, source, external_id). Reclaim rows use external_id NULL (multiple allowed).
ALTER TABLE public.mindfulness_events
  DROP CONSTRAINT IF EXISTS mindfulness_events_user_source_external_key;
ALTER TABLE public.mindfulness_events
  ADD CONSTRAINT mindfulness_events_user_source_external_key UNIQUE (user_id, source, external_id);

-- Optional: index for unified history ordering
CREATE INDEX IF NOT EXISTS idx_mindfulness_events_start_time
  ON public.mindfulness_events (start_time DESC NULLS LAST);

COMMENT ON COLUMN public.mindfulness_events.source IS 'reclaim = in-app event; health_connect = synced from HC';
COMMENT ON COLUMN public.mindfulness_events.external_id IS 'Stable id for HC dedupe (e.g. startTime_endTime ISO)';
