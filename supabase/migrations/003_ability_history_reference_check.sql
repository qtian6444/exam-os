-- ============================================================
-- Exam OS — P0-SECURITY-01 (R1 fix): ability_history ownership of
-- the referenced learning_record.
--
-- Closes the gap where a user could insert an ability_history row
-- that belongs to themselves but references another user's
-- learning_record. Now the referenced learning_record must also be
-- owned by the same auth.uid().
--
-- Run via Supabase SQL Editor (or `supabase db push`).
-- ============================================================

DROP POLICY IF EXISTS "ability_history_insert_own" ON ability_history;

CREATE POLICY "ability_history_insert_own" ON ability_history
  FOR INSERT
  WITH CHECK (
    user_id = (auth.uid())::text
    AND EXISTS (
      SELECT 1
      FROM learning_record AS lr
      WHERE lr.id = learning_record_id
        AND lr.user_id = (auth.uid())::text
    )
  );
