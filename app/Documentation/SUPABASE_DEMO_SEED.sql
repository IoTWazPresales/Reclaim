-- ============================================================================
-- Reclaim Demo Seed (idempotent)
-- ============================================================================
-- What this does:
-- 1) Attempts to create a demo auth user (best effort; may require elevated perms)
-- 2) Upserts demo profile row
-- 3) Seeds core demo data (entries, mood_checkins, sleep_sessions, training_* when present)
--
-- Run in Supabase SQL Editor.
-- If auth user creation is blocked, create the user in Auth UI first, then rerun this script.
-- ============================================================================

BEGIN;

-- ---------- Config ----------
-- Change these if needed before running
DO $$
DECLARE
  v_demo_user_id uuid := '11111111-2222-4333-8444-555555555555';
  v_demo_email text := 'demo@reclaim.app';
  v_demo_password text := 'ReclaimDemo!2026';
  v_now timestamptz := now();
  v_mood_tags_is_jsonb boolean := false;
BEGIN
  -- Ensure pgcrypto is available for password hashing
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create pgcrypto extension (continuing): %', SQLERRM;
  END;

  -- --------------------------------------------------------------------------
  -- 1) Best-effort auth.users insertion
  -- --------------------------------------------------------------------------
  -- This block may fail depending on your Supabase project permissions/version.
  -- If it fails, create demo user in Authentication UI and keep this same UUID.
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_demo_user_id) THEN
      INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        invited_at,
        confirmation_sent_at,
        recovery_sent_at,
        email_change_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        phone,
        phone_confirmed_at,
        phone_change,
        phone_change_token,
        phone_change_sent_at,
        confirmed_at,
        email_change,
        email_change_token_new,
        email_change_token_current,
        reauthentication_token,
        reauthentication_sent_at,
        is_sso_user,
        deleted_at
      )
      VALUES (
        v_demo_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        v_demo_email,
        crypt(v_demo_password, gen_salt('bf')),
        v_now,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"name":"Demo User","demo":true}'::jsonb,
        false,
        v_now,
        v_now,
        NULL,
        NULL,
        '',
        '',
        NULL,
        v_now,
        '',
        '',
        '',
        '',
        NULL,
        false,
        NULL
      );

      -- auth identity (email provider)
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        v_demo_user_id,
        jsonb_build_object('sub', v_demo_user_id::text, 'email', v_demo_email),
        'email',
        v_demo_email,
        v_now,
        v_now,
        v_now
      )
      ON CONFLICT (provider, provider_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Auth user insert skipped/failed: %', SQLERRM;
    RAISE NOTICE 'Create user manually in Auth UI with email %, then rerun script.', v_demo_email;
  END;

  -- --------------------------------------------------------------------------
  -- 2) Guard: auth user must exist before profile insert (FK profiles.id -> auth.users.id)
  -- --------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_demo_user_id) THEN
    RAISE EXCEPTION
      'Demo auth user is missing (id=%). Create user in Supabase Auth first (email=%), then rerun this script.',
      v_demo_user_id, v_demo_email;
  END IF;

  -- --------------------------------------------------------------------------
  -- 3) Profile row
  -- --------------------------------------------------------------------------
  INSERT INTO public.profiles (id, has_onboarded)
  VALUES (v_demo_user_id, true)
  ON CONFLICT (id) DO UPDATE SET has_onboarded = EXCLUDED.has_onboarded;

  -- Optional goals column
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'goals'
  ) THEN
    EXECUTE 'UPDATE public.profiles SET goals = $1 WHERE id = $2'
      USING ARRAY['Sleep', 'Focus', 'Energy'], v_demo_user_id;
  END IF;

  -- --------------------------------------------------------------------------
  -- 4) Entries (dashboard)
  -- --------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'entries'
  ) THEN
    DELETE FROM public.entries WHERE user_id = v_demo_user_id;

    INSERT INTO public.entries (user_id, ts, day_date, mood, sleep_hours, focus_minutes, meds_taken, note)
    VALUES
      (v_demo_user_id, v_now - interval '0 day', (v_now - interval '0 day')::date, 4, 7.6, 85, true,  'Solid day, good focus.'),
      (v_demo_user_id, v_now - interval '1 day', (v_now - interval '1 day')::date, 3, 6.8, 60, true,  'Moderate energy.'),
      (v_demo_user_id, v_now - interval '2 day', (v_now - interval '2 day')::date, 5, 8.1, 92, true,  'Great recovery.'),
      (v_demo_user_id, v_now - interval '3 day', (v_now - interval '3 day')::date, 2, 5.9, 40, false, 'Poor sleep night.'),
      (v_demo_user_id, v_now - interval '4 day', (v_now - interval '4 day')::date, 4, 7.2, 70, true,  'Back on track.');
  END IF;

  -- --------------------------------------------------------------------------
  -- 5) Mood check-ins
  -- --------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mood_checkins'
  ) THEN
    DELETE FROM public.mood_checkins WHERE user_id = v_demo_user_id;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'mood_checkins'
        AND column_name = 'tags'
        AND data_type = 'jsonb'
    ) INTO v_mood_tags_is_jsonb;

    -- Two supported schemas exist in this repo history:
    -- A) mood_checkins(created_at, mood, energy, tags, note, ctx)
    -- B) mood_checkins(ts, day_date, rating, note, tags, source)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'mood_checkins' AND column_name = 'mood'
    ) THEN
      IF v_mood_tags_is_jsonb THEN
        INSERT INTO public.mood_checkins (user_id, created_at, mood, energy, tags, note, ctx)
        VALUES
          (v_demo_user_id, v_now - interval '2 hour', 4, 4, '["calm","focused"]'::jsonb, 'Feeling steady this morning.', '{"screen":"dashboard","source":"demo_seed"}'::jsonb),
          (v_demo_user_id, v_now - interval '1 day',  3, 3, '["stressed"]'::jsonb,        'Busy day, manageable.',        '{"screen":"mood","source":"demo_seed"}'::jsonb),
          (v_demo_user_id, v_now - interval '2 day',  5, 4, '["positive"]'::jsonb,        'Good progress today.',         '{"screen":"mood","source":"demo_seed"}'::jsonb);
      ELSE
        INSERT INTO public.mood_checkins (user_id, created_at, mood, energy, tags, note, ctx)
        VALUES
          (v_demo_user_id, v_now - interval '2 hour', 4, 4, ARRAY['calm','focused'], 'Feeling steady this morning.', '{"screen":"dashboard","source":"demo_seed"}'::jsonb),
          (v_demo_user_id, v_now - interval '1 day',  3, 3, ARRAY['stressed'],        'Busy day, manageable.',        '{"screen":"mood","source":"demo_seed"}'::jsonb),
          (v_demo_user_id, v_now - interval '2 day',  5, 4, ARRAY['positive'],        'Good progress today.',         '{"screen":"mood","source":"demo_seed"}'::jsonb);
      END IF;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'mood_checkins' AND column_name = 'rating'
    ) THEN
      IF v_mood_tags_is_jsonb THEN
        INSERT INTO public.mood_checkins (user_id, ts, day_date, rating, note, tags, source)
        VALUES
          (v_demo_user_id, v_now - interval '2 hour', (v_now - interval '2 hour')::date, 4, 'Feeling steady this morning.', '["calm","focused"]'::jsonb, 'demo_seed'),
          (v_demo_user_id, v_now - interval '1 day',  (v_now - interval '1 day')::date,  3, 'Busy day, manageable.',        '["stressed"]'::jsonb,       'demo_seed'),
          (v_demo_user_id, v_now - interval '2 day',  (v_now - interval '2 day')::date,  5, 'Good progress today.',         '["positive"]'::jsonb,       'demo_seed');
      ELSE
        INSERT INTO public.mood_checkins (user_id, ts, day_date, rating, note, tags, source)
        VALUES
          (v_demo_user_id, v_now - interval '2 hour', (v_now - interval '2 hour')::date, 4, 'Feeling steady this morning.', ARRAY['calm','focused'], 'demo_seed'),
          (v_demo_user_id, v_now - interval '1 day',  (v_now - interval '1 day')::date,  3, 'Busy day, manageable.',        ARRAY['stressed'],       'demo_seed'),
          (v_demo_user_id, v_now - interval '2 day',  (v_now - interval '2 day')::date,  5, 'Good progress today.',         ARRAY['positive'],       'demo_seed');
      END IF;
    ELSE
      RAISE NOTICE 'Skipped mood_checkins seed: unsupported schema (no mood or rating column found).';
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- 6) Sleep sessions (aligned with current enriched schema)
  -- --------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sleep_sessions'
  ) THEN
    DELETE FROM public.sleep_sessions WHERE user_id = v_demo_user_id;

    INSERT INTO public.sleep_sessions (
      user_id, start_time, end_time, source, quality, note, efficiency, stages,
      metadata, duration_minutes, session_type, deep_sleep_minutes, rem_sleep_minutes,
      light_sleep_minutes, awake_minutes, avg_heart_rate, min_heart_rate, max_heart_rate,
      hrv_rmssd_ms, avg_respiratory_rate, avg_spo2, min_spo2, skin_temperature
    )
    VALUES
      (
        v_demo_user_id,
        date_trunc('day', v_now) - interval '1 day' + interval '22 hour 45 min',
        date_trunc('day', v_now) + interval '6 hour 35 min',
        'health_connect',
        84,
        'Main sleep',
        0.91,
        '{"deep":95,"rem":88,"light":262,"awake":25}'::jsonb,
        '{"provider":"Health Connect","device":"Demo Device","source":"demo_seed"}'::jsonb,
        470,
        'main',
        95, 88, 262, 25,
        58, 48, 76,
        42, 13.4, 97.8, 95.9, 34.1
      ),
      (
        v_demo_user_id,
        date_trunc('day', v_now) - interval '2 day' + interval '23 hour 20 min',
        date_trunc('day', v_now) - interval '1 day' + interval '7 hour 00 min',
        'health_connect',
        78,
        'Main sleep',
        0.86,
        '{"deep":82,"rem":79,"light":248,"awake":31}'::jsonb,
        '{"provider":"Health Connect","device":"Demo Device","source":"demo_seed"}'::jsonb,
        440,
        'main',
        82, 79, 248, 31,
        60, 50, 79,
        38, 13.8, 97.2, 95.2, 34.3
      ),
      (
        v_demo_user_id,
        date_trunc('day', v_now) - interval '1 day' + interval '14 hour 10 min',
        date_trunc('day', v_now) - interval '1 day' + interval '14 hour 45 min',
        'health_connect',
        72,
        'Short nap',
        0.83,
        '{"deep":5,"rem":8,"light":18,"awake":4}'::jsonb,
        '{"provider":"Health Connect","device":"Demo Device","source":"demo_seed"}'::jsonb,
        35,
        'nap',
        5, 8, 18, 4,
        62, 54, 78,
        34, 14.1, 97.1, 95.8, 34.5
      );
  END IF;

  -- --------------------------------------------------------------------------
  -- 7) Training seed (if training tables exist)
  -- --------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_profiles'
  ) THEN
    INSERT INTO public.training_profiles (user_id)
    VALUES (v_demo_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RAISE NOTICE 'Demo seed complete for user_id=% email=%', v_demo_user_id, v_demo_email;
END $$;

COMMIT;

