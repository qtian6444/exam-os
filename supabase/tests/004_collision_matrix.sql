-- ============================================================
-- Exam OS — R6 atomic operation collision matrix (DB integration test)
-- R9 EVIDENCE-FIRST revision. Fixes:
--   ENG-R8-002  psql :'var' interpolation moved OUT of every dollar-quoted body
--               (carried via session GUCs set outside the DO $...$ blocks).
--   ENG-R8-003  false-green self-catch removed — expected RPC errors are matched
--               by SQLSTATE (28000) or by EXACT message equality, never
--               `SQLERRM LIKE '%...%'`, so a harness failure can no longer be
--               mistaken for the expected RPC error.
--   ENG-R8-004  SET ROLE eliminated — scenario 13 is now a static ACL assertion.
--   ENG-R8-006  RUN_ID printed every run; cleanup residue honestly documented.
--
-- Verifies apply_learning_evidence (migration 004, hardened by 005) against the
-- full operation-identity and atomic-completion matrix required by Engineering QA.
--
-- ═══ DO NOT RUN ON PRODUCTION ═══
-- DESTRUCTIVE SUITE (inserts/deletes synthetic rows). RUN ONLY ON:
--   DISPOSABLE TEST DATABASE or DEDICATED STAGING DATABASE.
-- ══════════════════════════════
--
-- Run AFTER migrations 001..005. psql script (uses \set / \gset / \echo), NOT
-- the SQL Editor:
--   psql "$DATABASE_URL" -f supabase/tests/004_collision_matrix.sql
-- A clean run prints one RUN_ID NOTICE, then 19 PASS NOTICE lines, then
-- `R6 collision matrix: ALL PASS`, and exits 0. Any uncaught FAIL aborts with a
-- non-zero exit — never a false green (`\set ON_ERROR_STOP on` below).
--
-- ═══ Evidence honesty ═══
--   AUTH CONTEXT   = synthetic: SET LOCAL "request.jwt.claim.sub" (the GUC that
--                    auth.uid() reads). This is DB-level RPC-logic testing, NOT a
--                    real Supabase Auth/JWT request. Real caller runtime is
--                    deferred to the STAGING gate (see DEPLOYMENT_GATE.md).
--   SCENARIO 13    = STATIC ACL assertion (no SET ROLE): RLS enabled + no INSERT
--                    policy ⇒ direct pre-insert is default-deny. Runtime denial
--                    is verified at STAGING, not here.
--   SCENARIO 14    = LOST_RESPONSE_EQUIVALENT_RETRY (not a real network loss).
--   SCENARIO 15    = sequential coexistence, NOT concurrency.
--                    CONCURRENCY_RUNTIME = NOT_RUN.
--   SCENARIO 16    = PROFILE_NOT_FOUND raised BEFORE any write (early failure),
--                    NOT a mid-write rollback. MID_WRITE_ROLLBACK_RUNTIME = NOT_RUN.
-- ═════════════════════
--
-- ═══ Residue / recovery (R9 ENG-R8-006) ═══
--   RUN_ID is printed at the start of every run. All synthetic user_id /
--   operation-id values are fresh gen_random_uuid() per run, so residue can
--   never collide with real user data. Cleanup (DELETE by synthetic user_id,
--   FK-respecting order) runs at the end. `\set ON_ERROR_STOP on` means a
--   mid-script FAIL aborts BEFORE cleanup, so cleanup may NOT run.
--   Recovery: (1) discard/reset the disposable staging DB (preferred — this
--   suite is staging-only), or (2) manually DELETE the residue rows whose
--   user_id matches the printed run's synthetic UUIDs. There is deliberately no
--   silent fallback that could leave half-written rows unacknowledged.
-- ═════════════════════
-- ============================================================

-- Fail-fast: an uncaught test failure must abort the whole script with a
-- non-zero exit, never fall through to the final "ALL PASS" echo.
\set ON_ERROR_STOP on

-- ── Run-unique namespace (fresh UUIDs every run → no cross-run collision) ──
SELECT
  gen_random_uuid() AS run_id,
  gen_random_uuid() AS ua,      -- USER_A
  gen_random_uuid() AS ub,      -- USER_B
  gen_random_uuid() AS op1,     -- OP1 (base operation, scenarios 1..12)
  gen_random_uuid() AS op2,     -- OP2 (scenario 14)
  gen_random_uuid() AS op12,    -- scenario 12 operation id
  gen_random_uuid() AS op15a,   -- scenario 15 operation id #1
  gen_random_uuid() AS op15b,   -- scenario 15 operation id #2
  gen_random_uuid() AS u16,     -- scenario 16 user (no profile)
  gen_random_uuid() AS op16,    -- scenario 16 operation id
  gen_random_uuid() AS op17     -- scenario 17 operation id
\gset

-- psql does NOT interpolate :'var' inside dollar-quoted bodies (DO $$ ... $$).
-- Carry the run-unique values into the bodies through the session-GUC namespace,
-- set OUTSIDE any dollar-quote here, read via current_setting() below.
SELECT set_config('r9.run_id', :'run_id', false);
SELECT set_config('r9.ua',      :'ua',      false);
SELECT set_config('r9.ub',      :'ub',      false);
SELECT set_config('r9.u16',     :'u16',     false);
SELECT set_config('r9.op1',     :'op1',     false);
SELECT set_config('r9.op2',     :'op2',     false);
SELECT set_config('r9.op12',    :'op12',    false);
SELECT set_config('r9.op15a',   :'op15a',   false);
SELECT set_config('r9.op15b',   :'op15b',   false);
SELECT set_config('r9.op16',    :'op16',    false);
SELECT set_config('r9.op17',    :'op17',    false);

DO $$
BEGIN
  RAISE NOTICE 'R9 RUN_ID = %', current_setting('r9.run_id');
END $$;

-- Profiles must exist for the RPC (it raises PROFILE_NOT_FOUND otherwise).
-- Setup runs as the script owner (superuser), which bypasses RLS.
INSERT INTO user_profile (user_id) VALUES (:'ua') ON CONFLICT (user_id) DO NOTHING;
INSERT INTO user_profile (user_id) VALUES (:'ub') ON CONFLICT (user_id) DO NOTHING;

-- ═══ SCENARIO 1..2: USER_A, base payload choice/true/{"selectedOptionId":"a"}/skip=false/difficulty=0.4 ═══
BEGIN;
  SET LOCAL "request.jwt.claim.sub" = :'ua';
  DO $$
  DECLARE r jsonb;
  BEGIN
    r := apply_learning_evidence(current_setting('r9.op1')::uuid,'sess-1','card-1','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    IF r->>'status' IS DISTINCT FROM 'APPLIED_NEW' OR r->>'evidence_applied' IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'TEST 1 FAIL: %', r;
    END IF;
    RAISE NOTICE 'TEST 1 PASS (first apply)';
  END $$;
COMMIT;

BEGIN;
  SET LOCAL "request.jwt.claim.sub" = :'ua';
  DO $$
  DECLARE r jsonb;
  BEGIN
    r := apply_learning_evidence(current_setting('r9.op1')::uuid,'sess-1','card-1','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    IF r->>'status' IS DISTINCT FROM 'IDEMPOTENT_ALREADY_APPLIED' OR r->>'evidence_applied' IS DISTINCT FROM 'false' THEN
      RAISE EXCEPTION 'TEST 2 FAIL: %', r;
    END IF;
    RAISE NOTICE 'TEST 2 PASS (exact retry idempotent)';
  END $$;
COMMIT;

-- ═══ SCENARIO 3..12: one field changed → LEARNING_OPERATION_ID_COLLISION ═══
DO $$
DECLARE r jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', current_setting('r9.ua'), true);

  -- 3. changed session_id (same operation id op1) → collision
  BEGIN
    r := apply_learning_evidence(current_setting('r9.op1')::uuid,'sess-OTHER','card-1','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    RAISE EXCEPTION 'TEST 3 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'LEARNING_OPERATION_ID_COLLISION' THEN RAISE NOTICE 'TEST 3 PASS (changed session_id)';
    ELSE RAISE; END IF;
  END;

  -- 4. changed card_id → collision
  BEGIN
    r := apply_learning_evidence(current_setting('r9.op1')::uuid,'sess-1','card-OTHER','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    RAISE EXCEPTION 'TEST 4 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'LEARNING_OPERATION_ID_COLLISION' THEN RAISE NOTICE 'TEST 4 PASS (changed card_id)';
    ELSE RAISE; END IF;
  END;

  -- 5. changed card_type → collision
  BEGIN
    r := apply_learning_evidence(current_setting('r9.op1')::uuid,'sess-1','card-1','reorder',true,'{"selectedOptionId":"a"}',false,0.4);
    RAISE EXCEPTION 'TEST 5 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'LEARNING_OPERATION_ID_COLLISION' THEN RAISE NOTICE 'TEST 5 PASS (changed card_type)';
    ELSE RAISE; END IF;
  END;

  -- 6. changed correct → collision
  BEGIN
    r := apply_learning_evidence(current_setting('r9.op1')::uuid,'sess-1','card-1','choice',false,'{"selectedOptionId":"a"}',false,0.4);
    RAISE EXCEPTION 'TEST 6 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'LEARNING_OPERATION_ID_COLLISION' THEN RAISE NOTICE 'TEST 6 PASS (changed correct)';
    ELSE RAISE; END IF;
  END;

  -- 7. changed user_answer (genuinely different) → collision
  BEGIN
    r := apply_learning_evidence(current_setting('r9.op1')::uuid,'sess-1','card-1','choice',true,'{"selectedOptionId":"b"}',false,0.4);
    RAISE EXCEPTION 'TEST 7 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'LEARNING_OPERATION_ID_COLLISION' THEN RAISE NOTICE 'TEST 7 PASS (changed user_answer)';
    ELSE RAISE; END IF;
  END;

  -- 8. JSONB semantically-equal variant (key order/whitespace differ, equal value)
  --    → must be IDEMPOTENT, not collision (native jsonb equality).
  BEGIN
    r := apply_learning_evidence(current_setting('r9.op1')::uuid,'sess-1','card-1','choice',true,'{ "selectedOptionId" : "a" }',false,0.4);
    IF r->>'status' IS DISTINCT FROM 'IDEMPOTENT_ALREADY_APPLIED' THEN
      RAISE EXCEPTION 'TEST 8 FAIL: %', r;
    END IF;
    RAISE NOTICE 'TEST 8 PASS (jsonb semantically equal → idempotent)';
  END;

  -- 9. JSONB genuinely different (nested structure) → collision
  BEGIN
    r := apply_learning_evidence(current_setting('r9.op1')::uuid,'sess-1','card-1','choice',true,'{"selectedOptionId":"a","extra":1}',false,0.4);
    RAISE EXCEPTION 'TEST 9 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'LEARNING_OPERATION_ID_COLLISION' THEN RAISE NOTICE 'TEST 9 PASS (jsonb genuinely different)';
    ELSE RAISE; END IF;
  END;

  -- 10. changed skip_evidence → collision
  BEGIN
    r := apply_learning_evidence(current_setting('r9.op1')::uuid,'sess-1','card-1','choice',true,'{"selectedOptionId":"a"}',true,0.4);
    RAISE EXCEPTION 'TEST 10 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'LEARNING_OPERATION_ID_COLLISION' THEN RAISE NOTICE 'TEST 10 PASS (changed skip_evidence)';
    ELSE RAISE; END IF;
  END;

  -- 11. adjacent REAL difficulty (0.4 vs 0.4000001, distinct float4) → collision
  BEGIN
    r := apply_learning_evidence(current_setting('r9.op1')::uuid,'sess-1','card-1','choice',true,'{"selectedOptionId":"a"}',false,0.4000001);
    RAISE EXCEPTION 'TEST 11 FAIL: expected collision (REAL must not round), got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'LEARNING_OPERATION_ID_COLLISION' THEN RAISE NOTICE 'TEST 11 PASS (adjacent REAL difficulty)';
    ELSE RAISE; END IF;
  END;

  -- 12. SQL NULL vs JSON 'null'::jsonb (distinct identities) → collision.
  BEGIN
    r := apply_learning_evidence(current_setting('r9.op12')::uuid,'sess-12','card-12','choice',true,NULL,false,0.4);
    IF r->>'status' IS DISTINCT FROM 'APPLIED_NEW' THEN
      RAISE EXCEPTION 'TEST 12 SETUP FAIL: %', r;
    END IF;
    r := apply_learning_evidence(current_setting('r9.op12')::uuid,'sess-12','card-12','choice',true,'null'::jsonb,false,0.4);
    RAISE EXCEPTION 'TEST 12 FAIL: expected collision (SQL NULL != json null), got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'LEARNING_OPERATION_ID_COLLISION' THEN RAISE NOTICE 'TEST 12 PASS (SQL NULL vs json null)';
    ELSE RAISE; END IF;
  END;
END $$;

-- ═══ SCENARIO 13: direct client pre-insert attack → BLOCKED (static ACL) ═══
-- No SET ROLE here: the denial is asserted from the catalog (RLS enabled + no
-- INSERT policy ⇒ default-deny). The runtime denial is verified at STAGING.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'learning_record' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'TEST 13 FAIL: learning_record RLS is not enabled';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'learning_record' AND cmd = 'INSERT'
  ) THEN
    RAISE EXCEPTION 'TEST 13 FAIL: learning_record has an INSERT policy (direct pre-insert NOT blocked)';
  END IF;
  RAISE NOTICE 'TEST 13 PASS (direct pre-insert blocked: RLS enabled, no INSERT policy)';
END $$;

-- ═══ SCENARIO 14: LOST_RESPONSE_EQUIVALENT_RETRY ═══
-- NOT a real network response loss: it proves that once the first operation
-- COMMITS, a later retry of the SAME operation id returns IDEMPOTENT and does
-- not re-apply evidence — the equivalent semantics of a lost-response retry.
BEGIN;
  SET LOCAL "request.jwt.claim.sub" = :'ua';
  DO $$
  DECLARE r1 jsonb;
  BEGIN
    r1 := apply_learning_evidence(current_setting('r9.op2')::uuid,'sess-2','card-2','reorder',false,'{"orderedChunkIds":["c","b","a"]}',false,0.6);
    IF r1->>'status' IS DISTINCT FROM 'APPLIED_NEW' THEN
      RAISE EXCEPTION 'TEST 14 FAIL (first apply): %', r1;
    END IF;
    RAISE NOTICE 'TEST 14a PASS (first apply APPLIED_NEW)';
  END $$;
COMMIT;

BEGIN;
  SET LOCAL "request.jwt.claim.sub" = :'ua';
  DO $$
  DECLARE r2 jsonb;
  BEGIN
    r2 := apply_learning_evidence(current_setting('r9.op2')::uuid,'sess-2','card-2','reorder',false,'{"orderedChunkIds":["c","b","a"]}',false,0.6);
    IF r2->>'status' IS DISTINCT FROM 'IDEMPOTENT_ALREADY_APPLIED' THEN
      RAISE EXCEPTION 'TEST 14 FAIL (retry): %', r2;
    END IF;
    RAISE NOTICE 'TEST 14b PASS (lost-response-equivalent retry idempotent)';
  END $$;
COMMIT;

-- ═══ SCENARIO 15: different operation IDs (same user) both apply ═══
-- Sequential coexistence, NOT a concurrency test (CONCURRENCY_RUNTIME = NOT_RUN).
BEGIN;
  SET LOCAL "request.jwt.claim.sub" = :'ua';
  DO $$
  DECLARE r1 jsonb; r2 jsonb;
  BEGIN
    r1 := apply_learning_evidence(current_setting('r9.op15a')::uuid,'sess-3','card-3','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    r2 := apply_learning_evidence(current_setting('r9.op15b')::uuid,'sess-3','card-4','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    IF r1->>'status' IS DISTINCT FROM 'APPLIED_NEW' OR r2->>'status' IS DISTINCT FROM 'APPLIED_NEW' THEN
      RAISE EXCEPTION 'TEST 15 FAIL: % / %', r1, r2;
    END IF;
    RAISE NOTICE 'TEST 15 PASS (distinct operation ids both apply)';
  END $$;
COMMIT;

-- ═══ SCENARIO 16: missing profile → hard-fail before any write ═══
-- PROFILE_NOT_FOUND is raised at STEP 3, BEFORE learning_record / ability_history
-- writes. This is an EARLY failure, NOT a mid-write rollback
-- (MID_WRITE_ROLLBACK_RUNTIME = NOT_RUN).
BEGIN;
  SET LOCAL "request.jwt.claim.sub" = :'u16';
  DO $$
  DECLARE r jsonb;
  BEGIN
    BEGIN
      r := apply_learning_evidence(current_setting('r9.op16')::uuid,'sess-4','card-5','choice',true,'{"selectedOptionId":"a"}',false,0.4);
      RAISE EXCEPTION 'TEST 16 FAIL: expected PROFILE_NOT_FOUND, got %', r;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'PROFILE_NOT_FOUND' THEN NULL; ELSE RAISE; END IF;
    END;
    IF EXISTS (SELECT 1 FROM learning_record WHERE id = current_setting('r9.op16')::uuid) THEN
      RAISE EXCEPTION 'TEST 16 FAIL: learning_record was created despite PROFILE_NOT_FOUND';
    END IF;
    RAISE NOTICE 'TEST 16 PASS (profile-not-found fails before any write)';
  END $$;
COMMIT;

-- ═══ SCENARIO 17: unauthenticated → AUTH_REQUIRED ═══
BEGIN;
  SET LOCAL "request.jwt.claim.sub" = '';  -- no identity
  DO $$
  DECLARE r jsonb;
  BEGIN
    BEGIN
      r := apply_learning_evidence(current_setting('r9.op17')::uuid,'sess-5','card-6','choice',true,'{"selectedOptionId":"a"}',false,0.4);
      RAISE EXCEPTION 'TEST 17 FAIL: expected AUTH_REQUIRED, got %', r;
    EXCEPTION WHEN invalid_authorization_specification THEN
      RAISE NOTICE 'TEST 17 PASS (unauthenticated rejected)';
    END;
  END $$;
COMMIT;

-- ═══ SCENARIO 18: cross-user same operation id → collision (not idempotent) ═══
BEGIN;
  SET LOCAL "request.jwt.claim.sub" = :'ub';
  DO $$
  DECLARE r jsonb;
  BEGIN
    BEGIN
      r := apply_learning_evidence(current_setting('r9.op1')::uuid,'sess-1','card-1','choice',true,'{"selectedOptionId":"a"}',false,0.4);
      RAISE EXCEPTION 'TEST 18 FAIL: expected collision (cross-user), got %', r;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'LEARNING_OPERATION_ID_COLLISION' THEN RAISE NOTICE 'TEST 18 PASS (cross-user collision)';
      ELSE RAISE; END IF;
    END;
  END $$;
COMMIT;

-- ═══ CLEANUP: remove this run's synthetic rows (FK-respecting order) ═══
DELETE FROM ability_history WHERE user_id IN (:'ua', :'ub', :'u16');
DELETE FROM learning_record   WHERE user_id IN (:'ua', :'ub', :'u16');
DELETE FROM user_profile      WHERE user_id IN (:'ua', :'ub', :'u16');

-- ═══ END: all scenarios passed (any FAIL would have raised) ═══
\echo 'R6 collision matrix: ALL PASS'
