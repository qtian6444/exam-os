-- ============================================================
-- Exam OS — R7 profile integrity + privilege isolation (DB integration test)
--
-- Verifies migration 005 (R7-A hardened SECURITY DEFINER RPC + R7-B column-level
-- privilege isolation) AND the R8 profile create/update contract that the
-- frontend `persistUserProfile` relies on (INSERT then UPDATE-on-23505).
--
--   Row boundary      = RLS owner policy (user_id = auth.uid())
--   Column boundary   = column-level GRANT (USER_EDITABLE only)
--   Authoritative agg = SECURITY DEFINER RPC (runs as owner, bypasses columns)
--
-- ═══ DO NOT RUN ON PRODUCTION ═══
-- RUN ONLY ON: DISPOSABLE TEST DATABASE or DEDICATED STAGING DATABASE
-- (This suite inserts/deletes synthetic rows and creates a disposable DB role.
--  It must never run against the production Supabase project.)
-- ══════════════════════════════
--
-- Run AFTER migrations 001..005. psql script (uses \set / \gset / \echo), NOT
-- the SQL Editor:
--   psql "$DATABASE_URL" -f supabase/tests/005_profile_integrity.sql
-- A clean run prints 15 PASS NOTICE lines then `R7 profile integrity: ALL PASS`
-- and exits 0. Any uncaught FAIL aborts with a non-zero exit — never a false
-- green (`\set ON_ERROR_STOP on` below).
--
-- Tests (maps to Engineering QA DB test set 6..17):
--   T1  first-time authenticated CREATE (user_id + editable) → success + server defaults
--   T2  duplicate CREATE (user_id already exists) → 23505 (the client's UPDATE-fallback signal)
--   T3  existing profile editable UPDATE (editable-only, no user_id) → success
--   T4  UPDATE user_id (identity) → denied
--   T5  UPDATE of each authoritative ability_*/confidence_* (10) → denied
--   T6  INSERT of each authoritative ability_*/confidence_* (10) → denied
--   T7  id / created_at (immutable) → not client-writable
--   T8  cross-user UPDATE → 0 rows (RLS row boundary intact)
--   T9  direct learning_record INSERT → denied
--   T10 direct ability_history INSERT → denied
--   T11 authenticated RPC → APPLIED_NEW + learning_record + ability_history + authoritative profile update
--   T12 anon EXECUTE → denied
--   T13 PUBLIC EXECUTE → denied (fresh disposable role, actual execute attempt)
--   T14 authenticated without JWT → AUTH_REQUIRED (not a privilege error)
--   T15 ACL assertions match the intended column + function grants
--
-- ═══ Repeatability ═══
--   All synthetic user_id / operation id are generated per-run with
--   gen_random_uuid() (no fixed production-like IDs). The disposable role name
--   is run-unique. Cleanup (DELETE fixtures, DROP ROLE) runs at the end; if a
--   FAIL aborts mid-way it may not run, which is exactly why this suite is
--   restricted to a disposable/staging DB.
-- ═════════════════════
-- ============================================================

\set ON_ERROR_STOP on

-- ── Run-unique namespace (fresh UUIDs every run → no cross-run collision) ──
SELECT
  gen_random_uuid() AS ua,       -- USER_A (existing profile)
  gen_random_uuid() AS ub,       -- USER_B (cross-user target)
  gen_random_uuid() AS uc,       -- USER_C (RPC authoritative-write subject)
  gen_random_uuid() AS new_a,    -- NEW_A (first-time CREATE)
  gen_random_uuid() AS op_rpc,   -- operation id for the authenticated RPC test
  gen_random_uuid() AS op_dup,   -- operation id for direct-insert denial test
  gen_random_uuid() AS op_anon,  -- operation id for anon/PUBLIC/AUTH_REQUIRED tests
  ('r8_noexec_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)) AS noexec_role
\gset

-- ── Fixtures (run as script owner/superuser, bypassing RLS + column grants) ──
INSERT INTO user_profile (user_id, exam_type, exam_batch, daily_time)
VALUES (:'ua', 'CET4', '2026-12', '20min');
INSERT INTO user_profile (user_id, exam_type, exam_batch, daily_time)
VALUES (:'ub', 'CET6', '2027-06', '10min');
INSERT INTO user_profile (user_id) VALUES (:'uc');  -- ability_* server-default 0.0

-- Disposable role for the PUBLIC-EXECUTE assertion. It has USAGE on the schema
-- (so it can resolve the function) but no explicit EXECUTE grant — its only
-- possible EXECUTE would have come from PUBLIC, which migration 005 revoked.
CREATE ROLE :"noexec_role";
GRANT USAGE ON SCHEMA public TO :"noexec_role";

-- ═══ T1: first-time authenticated CREATE (user_id + editable) → success ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'new_a';
  DO $$
  DECLARE n integer; s real;
  BEGIN
    INSERT INTO user_profile (user_id, exam_type, exam_batch, daily_time)
    VALUES (:'new_a', 'CET4', '2026-12', '20min');
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'TEST 1 FAIL: create row_count=%', n; END IF;
    SELECT ability_sentence INTO s FROM user_profile WHERE user_id = :'new_a';
    IF s IS DISTINCT FROM 0.0 THEN
      RAISE EXCEPTION 'TEST 1 FAIL: ability_sentence default=% (expected 0.0)', s;
    END IF;
    RAISE NOTICE 'TEST 1 PASS (first-time authenticated CREATE + server defaults)';
  END $$;
ROLLBACK;

-- ═══ T2: duplicate CREATE → 23505 (persistUserProfile's UPDATE-fallback signal) ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'ua';
  DO $$
  BEGIN
    BEGIN
      INSERT INTO user_profile (user_id, exam_type, exam_batch, daily_time)
      VALUES (:'ua', 'CET4', '2026-12', '20min');
      RAISE EXCEPTION 'TEST 2 FAIL: duplicate user_id INSERT did not raise 23505';
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'TEST 2 PASS (duplicate user_id → 23505, client falls back to UPDATE)';
    END;
  END $$;
ROLLBACK;

-- ═══ T3: existing profile editable UPDATE (editable-only, no user_id) → success ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'ua';
  DO $$
  DECLARE n integer;
  BEGIN
    UPDATE user_profile
       SET exam_type = 'CET6', exam_batch = '2027-06', daily_time = '10min', updated_at = now()
     WHERE user_id = :'ua';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'TEST 3 FAIL: update row_count=%', n; END IF;
    RAISE NOTICE 'TEST 3 PASS (existing profile editable UPDATE)';
  END $$;
ROLLBACK;

-- ═══ T4: UPDATE user_id (identity) → denied ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'ua';
  DO $$
  BEGIN
    BEGIN
      UPDATE user_profile SET user_id = :'ub' WHERE user_id = :'ua';
      RAISE EXCEPTION 'TEST 4 FAIL: UPDATE of user_id was NOT blocked';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST 4 PASS (UPDATE identity user_id blocked)';
    END;
  END $$;
ROLLBACK;

-- ═══ T5: UPDATE of each authoritative column (10) → denied ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'ua';
  DO $$
  DECLARE
    uid  text  := :'ua';
    cols text[] := ARRAY[
      'ability_vocabulary','ability_sentence','ability_reading','ability_listening','ability_writing',
      'confidence_vocabulary','confidence_sentence','confidence_reading','confidence_listening','confidence_writing'];
    c text;
  BEGIN
    FOREACH c IN ARRAY cols LOOP
      BEGIN
        EXECUTE format('UPDATE user_profile SET %I = 0.5 WHERE user_id = %L', c, uid);
        RAISE EXCEPTION 'TEST 5 FAIL: UPDATE of % was NOT blocked', c;
      EXCEPTION WHEN insufficient_privilege THEN NULL;
      END;
    END LOOP;
    RAISE NOTICE 'TEST 5 PASS (UPDATE of all 10 authoritative columns blocked)';
  END $$;
ROLLBACK;

-- ═══ T6: INSERT of each authoritative column (10) → denied ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'ua';
  DO $$
  DECLARE
    cols text[] := ARRAY[
      'ability_vocabulary','ability_sentence','ability_reading','ability_listening','ability_writing',
      'confidence_vocabulary','confidence_sentence','confidence_reading','confidence_listening','confidence_writing'];
    c text;
    new_uid uuid;
  BEGIN
    FOREACH c IN ARRAY cols LOOP
      new_uid := gen_random_uuid();
      -- Align the claim with the would-be row so RLS would pass if the column
      -- grant were ever widened; the only blocker here is the column privilege.
      PERFORM set_config('request.jwt.claim.sub', new_uid::text, true);
      BEGIN
        EXECUTE format('INSERT INTO user_profile (user_id, %I) VALUES (%L, 0.5)', c, new_uid);
        RAISE EXCEPTION 'TEST 6 FAIL: INSERT of % was NOT blocked', c;
      EXCEPTION WHEN insufficient_privilege THEN NULL;
      END;
    END LOOP;
    RAISE NOTICE 'TEST 6 PASS (INSERT of all 10 authoritative columns blocked)';
  END $$;
ROLLBACK;

-- ═══ T7: id / created_at (immutable) → not client-writable ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'ua';
  DO $$
  DECLARE nu uuid;
  BEGIN
    -- UPDATE id
    BEGIN
      UPDATE user_profile SET id = gen_random_uuid() WHERE user_id = :'ua';
      RAISE EXCEPTION 'TEST 7 FAIL: UPDATE id was NOT blocked';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    -- UPDATE created_at
    BEGIN
      UPDATE user_profile SET created_at = now() WHERE user_id = :'ua';
      RAISE EXCEPTION 'TEST 7 FAIL: UPDATE created_at was NOT blocked';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    -- INSERT id
    nu := gen_random_uuid();
    PERFORM set_config('request.jwt.claim.sub', nu::text, true);
    BEGIN
      EXECUTE format('INSERT INTO user_profile (user_id, id) VALUES (%L, %L)', nu, gen_random_uuid());
      RAISE EXCEPTION 'TEST 7 FAIL: INSERT id was NOT blocked';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    -- INSERT created_at
    nu := gen_random_uuid();
    PERFORM set_config('request.jwt.claim.sub', nu::text, true);
    BEGIN
      EXECUTE format('INSERT INTO user_profile (user_id, created_at) VALUES (%L, %L)', nu, now());
      RAISE EXCEPTION 'TEST 7 FAIL: INSERT created_at was NOT blocked';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RAISE NOTICE 'TEST 7 PASS (id / created_at not client-writable)';
  END $$;
ROLLBACK;

-- ═══ T8: cross-user UPDATE → 0 rows (RLS row boundary intact) ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'ua';
  DO $$
  DECLARE n integer;
  BEGIN
    UPDATE user_profile SET exam_type = 'CET6' WHERE user_id = :'ub';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'TEST 8 FAIL: cross-user UPDATE affected % rows', n; END IF;
    RAISE NOTICE 'TEST 8 PASS (cross-user UPDATE blocked by RLS)';
  END $$;
ROLLBACK;

-- ═══ T9: direct learning_record INSERT → denied (R4 dropped the INSERT policy) ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'ua';
  DO $$
  BEGIN
    BEGIN
      INSERT INTO learning_record (id, user_id, session_id, card_type, card_id, correct, user_answer, skip_evidence, difficulty)
      VALUES (:'op_dup', :'ua', 'sess-x', 'choice', 'card-x', true, '{"selectedOptionId":"a"}', false, 0.4);
      RAISE EXCEPTION 'TEST 9 FAIL: direct learning_record INSERT was NOT blocked';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST 9 PASS (direct learning_record INSERT blocked)';
    END;
  END $$;
ROLLBACK;

-- ═══ T10: direct ability_history INSERT → denied (R4 dropped the INSERT policy) ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'ua';
  DO $$
  BEGIN
    BEGIN
      INSERT INTO ability_history (id, user_id, learning_record_id, ability_key, evidence_weight, correct, score_before, score_after, confidence_before, confidence_after)
      VALUES (gen_random_uuid(), :'ua', gen_random_uuid(), 'sentence', 0.2, true, 0.0, 0.2, 0.0, 0.1);
      RAISE EXCEPTION 'TEST 10 FAIL: direct ability_history INSERT was NOT blocked';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST 10 PASS (direct ability_history INSERT blocked)';
    END;
  END $$;
ROLLBACK;

-- ═══ T11: authenticated RPC → APPLIED_NEW + learning_record + ability_history + authoritative update ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'uc';
  DO $$
  DECLARE
    r jsonb;
    n_rec integer; n_hist integer;
    s_before real; s_after real; c_after real;
  BEGIN
    SELECT ability_sentence INTO s_before FROM user_profile WHERE user_id = :'uc';

    r := apply_learning_evidence(:'op_rpc','sess-c','card-c','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    IF r->>'status' IS DISTINCT FROM 'APPLIED_NEW' THEN
      RAISE EXCEPTION 'TEST 11 FAIL: status=%', r->>'status';
    END IF;
    IF r->>'evidence_applied' IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'TEST 11 FAIL: evidence_applied=%', r->>'evidence_applied';
    END IF;

    SELECT count(*) INTO n_rec FROM learning_record WHERE id = :'op_rpc';
    IF n_rec <> 1 THEN RAISE EXCEPTION 'TEST 11 FAIL: learning_record count=%', n_rec; END IF;

    -- choice evidence → sentence + reading = 2 history rows
    SELECT count(*) INTO n_hist FROM ability_history WHERE learning_record_id = :'op_rpc';
    IF n_hist <> 2 THEN RAISE EXCEPTION 'TEST 11 FAIL: ability_history count=%', n_hist; END IF;

    SELECT ability_sentence, confidence_sentence INTO s_after, c_after
      FROM user_profile WHERE user_id = :'uc';
    IF s_after IS NULL OR s_after <= s_before THEN
      RAISE EXCEPTION 'TEST 11 FAIL: ability_sentence not increased (% -> %)', s_before, s_after;
    END IF;
    IF c_after IS NULL OR c_after <= 0.0 THEN
      RAISE EXCEPTION 'TEST 11 FAIL: confidence_sentence not updated (%)', c_after;
    END IF;

    RAISE NOTICE 'TEST 11 PASS (authenticated RPC writes learning_record + ability_history + authoritative profile)';
  END $$;
ROLLBACK;

-- ═══ T12: anon role cannot EXECUTE the RPC ═══
BEGIN;
  SET LOCAL ROLE anon;
  DO $$
  BEGIN
    BEGIN
      PERFORM apply_learning_evidence(:'op_anon','sess-g','card-g','choice',true,'{"selectedOptionId":"a"}',false,0.4);
      RAISE EXCEPTION 'TEST 12 FAIL: anon executed the RPC';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST 12 PASS (anon cannot EXECUTE the RPC)';
    END;
  END $$;
ROLLBACK;

-- ═══ T13: PUBLIC no EXECUTE (fresh disposable role, actual execute attempt) ═══
-- The disposable role has USAGE on schema public but no explicit EXECUTE; its
-- only route to EXECUTE would be PUBLIC, which migration 005 revoked.
BEGIN;
  SET LOCAL ROLE :"noexec_role";
  DO $$
  BEGIN
    BEGIN
      PERFORM public.apply_learning_evidence(:'op_anon','sess-p','card-p','choice',true,'{"selectedOptionId":"a"}',false,0.4);
      RAISE EXCEPTION 'TEST 13 FAIL: a PUBLIC-granted role executed the RPC';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST 13 PASS (PUBLIC EXECUTE revoked — fresh role cannot execute)';
    END;
  END $$;
ROLLBACK;

-- ═══ T14: authenticated without JWT identity → AUTH_REQUIRED (not a privilege error) ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = '';  -- no identity
  DO $$
  BEGIN
    BEGIN
      PERFORM apply_learning_evidence(:'op_anon','sess-h','card-h','choice',true,'{"selectedOptionId":"a"}',false,0.4);
      RAISE EXCEPTION 'TEST 14 FAIL: expected AUTH_REQUIRED';
    EXCEPTION WHEN invalid_authorization_specification THEN
      IF SQLERRM LIKE '%AUTH_REQUIRED%' THEN
        RAISE NOTICE 'TEST 14 PASS (no JWT → AUTH_REQUIRED, not a privilege error)';
      ELSE
        RAISE;
      END IF;
    END;
  END $$;
ROLLBACK;

-- ═══ T15: ACL assertions match the intended column + function grants ═══
DO $$
DECLARE
  auth_cols text[] := ARRAY[
    'ability_vocabulary','ability_sentence','ability_reading','ability_listening','ability_writing',
    'confidence_vocabulary','confidence_sentence','confidence_reading','confidence_listening','confidence_writing'];
  ins_ok text[] := ARRAY['user_id','exam_type','exam_batch','daily_time','updated_at'];
  upd_ok text[] := ARRAY['exam_type','exam_batch','daily_time','updated_at'];
  c text;
  fn text := 'public.apply_learning_evidence(uuid,text,text,text,boolean,jsonb,boolean,real)';
BEGIN
  -- INSERT: granted exactly {user_id, exam_type, exam_batch, daily_time, updated_at}
  FOREACH c IN ARRAY ins_ok LOOP
    IF NOT has_column_privilege('authenticated', 'public.user_profile', c, 'INSERT') THEN
      RAISE EXCEPTION 'TEST 15 FAIL: INSERT(%) is false', c;
    END IF;
  END LOOP;
  FOREACH c IN ARRAY auth_cols LOOP
    IF has_column_privilege('authenticated', 'public.user_profile', c, 'INSERT') THEN
      RAISE EXCEPTION 'TEST 15 FAIL: INSERT(%) unexpectedly true', c;
    END IF;
  END LOOP;
  IF has_column_privilege('authenticated', 'public.user_profile', 'id', 'INSERT') THEN
    RAISE EXCEPTION 'TEST 15 FAIL: INSERT(id) unexpectedly true';
  END IF;
  IF has_column_privilege('authenticated', 'public.user_profile', 'created_at', 'INSERT') THEN
    RAISE EXCEPTION 'TEST 15 FAIL: INSERT(created_at) unexpectedly true';
  END IF;

  -- UPDATE: granted exactly {exam_type, exam_batch, daily_time, updated_at}
  FOREACH c IN ARRAY upd_ok LOOP
    IF NOT has_column_privilege('authenticated', 'public.user_profile', c, 'UPDATE') THEN
      RAISE EXCEPTION 'TEST 15 FAIL: UPDATE(%) is false', c;
    END IF;
  END LOOP;
  IF has_column_privilege('authenticated', 'public.user_profile', 'user_id', 'UPDATE') THEN
    RAISE EXCEPTION 'TEST 15 FAIL: UPDATE(user_id) unexpectedly true';
  END IF;
  FOREACH c IN ARRAY auth_cols LOOP
    IF has_column_privilege('authenticated', 'public.user_profile', c, 'UPDATE') THEN
      RAISE EXCEPTION 'TEST 15 FAIL: UPDATE(%) unexpectedly true', c;
    END IF;
  END LOOP;
  IF has_column_privilege('authenticated', 'public.user_profile', 'id', 'UPDATE') THEN
    RAISE EXCEPTION 'TEST 15 FAIL: UPDATE(id) unexpectedly true';
  END IF;
  IF has_column_privilege('authenticated', 'public.user_profile', 'created_at', 'UPDATE') THEN
    RAISE EXCEPTION 'TEST 15 FAIL: UPDATE(created_at) unexpectedly true';
  END IF;

  -- EXECUTE: authenticated has it, anon does not, PUBLIC (fresh role) does not.
  IF NOT has_function_privilege('authenticated', fn, 'EXECUTE') THEN
    RAISE EXCEPTION 'TEST 15 FAIL: authenticated EXECUTE is false';
  END IF;
  IF has_function_privilege('anon', fn, 'EXECUTE') THEN
    RAISE EXCEPTION 'TEST 15 FAIL: anon EXECUTE unexpectedly true';
  END IF;
  IF has_function_privilege(:'noexec_role', fn, 'EXECUTE') THEN
    RAISE EXCEPTION 'TEST 15 FAIL: PUBLIC (fresh role) EXECUTE unexpectedly true';
  END IF;

  RAISE NOTICE 'TEST 15 PASS (ACL matches intended column + function grants)';
END $$;

-- ═══ CLEANUP: remove this run's synthetic rows + disposable role ═══
DELETE FROM ability_history WHERE user_id IN (:'ua', :'ub', :'uc');
DELETE FROM learning_record   WHERE user_id IN (:'ua', :'ub', :'uc');
DELETE FROM user_profile      WHERE user_id IN (:'ua', :'ub', :'uc');
-- Drop the disposable role's granted privileges (USAGE on schema public) before
-- the role itself, else DROP ROLE fails with "privileges for schema public".
DROP OWNED BY :"noexec_role";
DROP ROLE :"noexec_role";

-- ═══ END: all tests passed (any FAIL would have raised and aborted) ═══
\echo 'R7 profile integrity: ALL PASS'
