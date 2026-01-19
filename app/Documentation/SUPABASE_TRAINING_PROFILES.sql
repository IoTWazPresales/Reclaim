-- Training Profiles Table
-- Stores user training preferences, goals, equipment, and constraints

CREATE TABLE IF NOT EXISTS training_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goals JSONB NOT NULL DEFAULT '{}'::jsonb, -- { build_muscle: 0.4, build_strength: 0.4, lose_fat: 0.2 }
  days_per_week INTEGER NOT NULL DEFAULT 3 CHECK (days_per_week >= 1 AND days_per_week <= 7),
  preferred_time_window JSONB DEFAULT '{}'::jsonb, -- { morning: true, startRange: 6, endRange: 10 } or { evening: true, startRange: 17, endRange: 21 }
  equipment_access JSONB NOT NULL DEFAULT '[]'::jsonb, -- ["barbell", "dumbbells", "cables", "machines", "cardio"]
  constraints JSONB NOT NULL DEFAULT '{}'::jsonb, -- { injuries: [], forbiddenMovements: [], preferences: {} }
  baselines JSONB DEFAULT '{}'::jsonb, -- { "bench_press": 60, "squat": 100, ... } - typical working weights
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS training_profiles_user_id_idx ON training_profiles(user_id);

-- RLS Policies
ALTER TABLE training_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own profile
CREATE POLICY "Users can view own training profile"
  ON training_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training profile"
  ON training_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training profile"
  ON training_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own training profile"
  ON training_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_training_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER training_profiles_updated_at
  BEFORE UPDATE ON training_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_training_profiles_updated_at();
