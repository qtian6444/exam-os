-- ============================================================
-- Exam OS — R7-A/R7-B profile integrity + privilege isolation (DB integration test)
--
-- Verifies migration 005: user_profile column-level privileges (R7-B) and the
-- hardened SECURITY DEFINER RPC's authoritative write path (R7-A).
--
--   Row boundary      = RLS owner policy (user_id = auth.uid())
--   Column boundary   = column-level GRANT (USER_EDITABLE only)
--   Authoritative agg = SECURITY DEFINER RPC (runs as owner, bypasses columns)
--
-- Tests (A..J):
--   A  authenticated INSERT of user-editable columns → allowed
--   B  authenticated INSERT including ability_sentence → blocked
--   C  authenticated UPDATE of user-editable columns → allowed
--   D  authenticated UPDATE of ability_sentence → blocked
--   E  authenticated UPDATE of user_id (identity) → blocked
--   F  RPC (SECURITY DEFINER) still writes ability_* via authenticated
--   G  anon role cannot EXECUTE the RPC
--   H  authenticated without JWT identity → AUTH_REQUIRED (not a privilege error)
--   I  cross-user UPDATE → 0 rows (RLS row boundary still intact)
--   J  INSERT omitting authoritative columns → server default 0.0
--
-- Run AFTER migrations 001..005. psql script:
--   psql "$DATABASE_URL" -f supabase/tests/005_profile_integrity.sql
-- Fail-fast: `\set ON_ERROR_STOP on` below aborts on any uncaught FAIL (a
-- clean run prints 10 PASS NOTICE lines then "R7 profile integrity: ALL PASS"
-- and exits 0; any failure exits non-zero — never a false green).
-- ============================================================

\set ON_ERROR_STOP on

-- ── Fixtures (fixed UUIDs) ──
\set USER_A 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
\set USER_B 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
\set USER_C 'cccccccc-cccc-cccc-cccc-cccccccccccc'
\set NEW_A  'dddddddd-dddd-dddd-dddd-dddddddddddd'
\set NEW_B  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
\set NEW_J  'ffffffff-ffff-ffff-ffff-ffffffffffff'

-- Setup runs as the script owner (superuser), which bypasses RLS and column
-- privileges. USER_A / USER_B / USER_C must exist for the RLS/column tests.
INSERT INTO user_profile (user_id, exam_type, exam_batch, daily_time)
VALUES (:'USER_A', 'CET4', '2026-12', '20min')
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO user_profile (user_id, exam_type, exam_batch, daily_time)
VALUES (:'USER_B', 'CET6', '2027-06', '10min')
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO user_profile (user_id)
VALUES (:'USER_C')
ON CONFLICT (user_id) DO NOTHING;

-- ═══ TEST A: authenticated INSERT of user-editable columns → allowed ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'NEW_A';
  DO $$
  DECLARE n integer;
  BEGIN
    INSERT INTO user_profile (user_id, exam_type, exam_batch, daily_time)
    VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'CET4', '2026-12', '20min');
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'TEST A FAIL: row_count=%', n; END IF;
    RAISE NOTICE 'TEST A PASS (authenticated INSERT user-editable)';
  END $$;
ROLLBACK;

-- ═══ TEST B: authenticated INSERT including ability_sentence → blocked ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'NEW_B';
  DO $$
  BEGIN
    BEGIN
      INSERT INTO user_profile (user_id, exam_type, ability_sentence)
      VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'CET4', 0.5);
      RAISE EXCEPTION 'TEST B FAIL: INSERT with ability_sentence was NOT blocked';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST B PASS (INSERT of authoritative column blocked)';
    END;
  END $$;
ROLLBACK;

-- ═══ TEST C: authenticated UPDATE of user-editable columns → allowed ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'USER_A';
  DO $$
  DECLARE n integer;
  BEGIN
    UPDATE user_profile SET exam_type = 'CET6', updated_at = now()
    WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'TEST C FAIL: row_count=%', n; END IF;
    RAISE NOTICE 'TEST C PASS (authenticated UPDATE user-editable)';
  END $$;
ROLLBACK;

-- ═══ TEST D: authenticated UPDATE of ability_sentence → blocked ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'USER_A';
  DO $$
  BEGIN
    BEGIN
      UPDATE user_profile SET ability_sentence = 0.9
      WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      RAISE EXCEPTION 'TEST D FAIL: UPDATE of ability_sentence was NOT blocked';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST D PASS (UPDATE of authoritative column blocked)';
    END;
  END $$;
ROLLBACK;

-- ═══ TEST E: authenticated UPDATE of user_id (identity) → blocked ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'USER_A';
  DO $$
  BEGIN
    BEGIN
      UPDATE user_profile SET user_id = 'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz'
      WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      RAISE EXCEPTION 'TEST E FAIL: UPDATE of user_id was NOT blocked';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST E PASS (UPDATE of identity column blocked)';
    END;
  END $$;
ROLLBACK;

-- ═══ TEST F: RPC (SECURITY DEFINER) still writes ability_* via authenticated ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'USER_C';
  DO $$
  DECLARE r jsonb; s real;
  BEGIN
    r := apply_learning_evidence('99999999-9999-9999-9999-999999999999','sess-c','card-c','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    IF r->>'status' IS DISTINCT FROM 'APPLIED_NEW' THEN
      RAISE EXCEPTION 'TEST F FAIL: %', r;
    END IF;
    SELECT ability_sentence INTO s FROM user_profile WHERE user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    IF s IS NULL OR s <= 0.0 THEN
      RAISE EXCEPTION 'TEST F FAIL: ability_sentence not updated (got %)', s;
    END IF;
    RAISE NOTICE 'TEST F PASS (RPC writes authoritative ability via DEFINER)';
  END $$;
COMMIT;

-- ═══ TEST G: anon role cannot EXECUTE the RPC ═══
BEGIN;
  SET LOCAL ROLE anon;
  DO $$
  BEGIN
    BEGIN
      PERFORM apply_learning_evidence('88888888-8888-8888-8888-888888888888','sess-g','card-g','choice',true,'{"selectedOptionId":"a"}',false,0.4);
      RAISE EXCEPTION 'TEST G FAIL: anon executed the RPC';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST G PASS (anon cannot EXECUTE the RPC)';
    END;
  END $$;
ROLLBACK;

-- ═══ TEST H: authenticated without JWT identity → AUTH_REQUIRED (not privilege) ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = '';  -- no identity
  DO $$
  BEGIN
    BEGIN
      PERFORM apply_learning_evidence('77777777-7777-7777-7777-777777777777','sess-h','card-h','choice',true,'{"selectedOptionId":"a"}',false,0.4);
      RAISE EXCEPTION 'TEST H FAIL: expected AUTH_REQUIRED';
    EXCEPTION WHEN invalid_authorization_specification THEN
      IF SQLERRM LIKE '%AUTH_REQUIRED%' THEN
        RAISE NOTICE 'TEST H PASS (no JWT → AUTH_REQUIRED)';
      ELSE
        RAISE;
      END IF;
    END;
  END $$;
ROLLBACK;

-- ═══ TEST I: cross-user UPDATE → 0 rows (RLS row boundary intact) ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'USER_A';
  DO $$
  DECLARE n integer;
  BEGIN
    UPDATE user_profile SET exam_type = 'CET6'
    WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'TEST I FAIL: cross-user UPDATE affected % rows', n; END IF;
    RAISE NOTICE 'TEST I PASS (cross-user UPDATE blocked by RLS)';
  END $$;
ROLLBACK;

-- ═══ TEST J: INSERT omitting authoritative columns → server default 0.0 ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'NEW_J';
  DO $$
  DECLARE s real;
  BEGIN
    INSERT INTO user_profile (user_id, exam_type)
    VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'CET4');
    SELECT ability_sentence INTO s FROM user_profile WHERE user_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    IF s IS DISTINCT FROM 0.0 THEN
      RAISE EXCEPTION 'TEST J FAIL: ability_sentence default = % (expected 0.0)', s;
    END IF;
    RAISE NOTICE 'TEST J PASS (authoritative column server-defaulted to 0.0)';
  END $$;
ROLLBACK;

-- ═══ END: all tests passed (any FAIL would have raised and aborted) ═══
\echo 'R7 profile integrity: ALL PASS'
