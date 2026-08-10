-- ============================================
-- Exam OS — 5-Table Schema Migration
-- Copy & paste into Supabase SQL Editor → Run
-- ============================================

-- 1. user_profile
-- One row per user. user_id is a device-generated UUID stored in localStorage.
-- No auth dependency for MVP.
CREATE TABLE IF NOT EXISTS user_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,             -- Device-generated UUID, no FK to auth.users (MVP)

  -- Onboarding
  exam_type TEXT CHECK (exam_type IN ('CET4', 'CET6')),
  exam_batch TEXT CHECK (exam_batch IN ('2026-12', '2027-06', '2027-12', 'later', 'undecided')),
  daily_time TEXT CHECK (daily_time IN ('5min', '10min', '20min', '30min+')),

  -- Current ability snapshot
  ability_vocabulary REAL DEFAULT 0.0,
  ability_sentence   REAL DEFAULT 0.0,
  ability_reading    REAL DEFAULT 0.0,
  ability_listening  REAL DEFAULT 0.0,
  ability_writing    REAL DEFAULT 0.0,

  -- Confidence per ability
  confidence_vocabulary REAL DEFAULT 0.0,
  confidence_sentence   REAL DEFAULT 0.0,
  confidence_reading    REAL DEFAULT 0.0,
  confidence_listening  REAL DEFAULT 0.0,
  confidence_writing    REAL DEFAULT 0.0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. content_library
CREATE TABLE IF NOT EXISTS content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_exam TEXT NOT NULL,
  set_number INTEGER CHECK (set_number BETWEEN 1 AND 3),
  content_type TEXT NOT NULL CHECK (content_type IN ('passage', 'sentence', 'question', 'chunk_group')),
  title TEXT,
  body TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  main_clause TEXT,
  relation TEXT,
  natural_meaning TEXT,
  chunks JSONB,
  correct_order TEXT[],
  difficulty REAL DEFAULT 0.5,
  word_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. content_skill
CREATE TABLE IF NOT EXISTS content_skill (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES content_library(id) ON DELETE CASCADE,
  skill_code TEXT NOT NULL CHECK (skill_code IN ('R1', 'R2', 'R3', 'R4', 'R5')),
  skill_weight REAL NOT NULL DEFAULT 1.0,
  UNIQUE(content_id, skill_code)
);

-- 4. learning_record
CREATE TABLE IF NOT EXISTS learning_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  content_id UUID REFERENCES content_library(id),
  card_type TEXT NOT NULL CHECK (card_type IN ('choice', 'reading_breakdown', 'reorder')),
  card_id TEXT NOT NULL,
  correct BOOLEAN,
  user_answer JSONB,
  attempt_number INTEGER DEFAULT 1,
  time_spent_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ability_history
CREATE TABLE IF NOT EXISTS ability_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  learning_record_id UUID REFERENCES learning_record(id),
  ability_key TEXT NOT NULL CHECK (ability_key IN ('vocabulary', 'sentence', 'reading', 'listening', 'writing')),
  evidence_weight REAL NOT NULL,
  correct BOOLEAN,
  score_before REAL NOT NULL,
  score_after REAL NOT NULL,
  confidence_before REAL NOT NULL,
  confidence_after REAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learning_record_user ON learning_record(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_record_session ON learning_record(session_id);
CREATE INDEX IF NOT EXISTS idx_ability_history_user ON ability_history(user_id, ability_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_library_source ON content_library(source_exam);
CREATE INDEX IF NOT EXISTS idx_content_skill_content ON content_skill(content_id);

-- ============================================
-- RLS Policies (MVP: allow all operations for now)
-- Tighten when auth is added.
-- ============================================
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_skill ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE ability_history ENABLE ROW LEVEL SECURITY;

-- user_profile: allow insert/select/update by matching user_id
CREATE POLICY "user_profile_access" ON user_profile
  FOR ALL USING (true) WITH CHECK (true);

-- content_library: public read
CREATE POLICY "content_library_read" ON content_library
  FOR SELECT USING (true);

-- content_skill: public read
CREATE POLICY "content_skill_read" ON content_skill
  FOR SELECT USING (true);

-- learning_record: allow insert/select by any user (MVP)
CREATE POLICY "learning_record_access" ON learning_record
  FOR ALL USING (true) WITH CHECK (true);

-- ability_history: allow insert/select by any user (MVP)
CREATE POLICY "ability_history_access" ON ability_history
  FOR ALL USING (true) WITH CHECK (true);
