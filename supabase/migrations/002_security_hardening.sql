-- ============================================================
-- Exam OS — P0-SECURITY-02: Security Boundary Hardening
-- Replaces device-UUID / open RLS with auth.uid() ownership.
--
-- Run via `supabase db push` or Supabase SQL Editor.
-- Requires Supabase Auth "Anonymous Sign-Ins" to be enabled
-- (Dashboard → Authentication → Sign In / Up → Anonymous).
-- ============================================================

-- ── 1. Drop permissive core-user-data policies ──
DROP POLICY IF EXISTS "user_profile_access" ON user_profile;
DROP POLICY IF EXISTS "learning_record_access" ON learning_record;
DROP POLICY IF EXISTS "ability_history_access" ON ability_history;

-- ── 2. user_profile: owner-only SELECT / INSERT / UPDATE ──
CREATE POLICY "user_profile_select_own" ON user_profile
  FOR SELECT
  USING (user_id = (auth.uid())::text);

CREATE POLICY "user_profile_insert_own" ON user_profile
  FOR INSERT
  WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY "user_profile_update_own" ON user_profile
  FOR UPDATE
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

-- ── 3. learning_record: owner-only SELECT / INSERT (append-oriented) ──
CREATE POLICY "learning_record_select_own" ON learning_record
  FOR SELECT
  USING (user_id = (auth.uid())::text);

CREATE POLICY "learning_record_insert_own" ON learning_record
  FOR INSERT
  WITH CHECK (user_id = (auth.uid())::text);

-- ── 4. ability_history: owner-only SELECT / INSERT (append-oriented) ──
CREATE POLICY "ability_history_select_own" ON ability_history
  FOR SELECT
  USING (user_id = (auth.uid())::text);

CREATE POLICY "ability_history_insert_own" ON ability_history
  FOR INSERT
  WITH CHECK (user_id = (auth.uid())::text);

-- ── 5. Shared content ──
-- content_library / content_skill remain public READ (shared learning content,
-- not user data). No INSERT / UPDATE / DELETE policy exists for either table,
-- so authenticated clients cannot write them through PostgREST (RLS default-deny).
-- (Existing "content_library_read" / "content_skill_read" policies unchanged.)
