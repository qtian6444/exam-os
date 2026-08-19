-- ============================================================
-- Exam OS — R6 atomic operation collision matrix (DB integration test)
--
-- Verifies apply_learning_evidence (migration 004, hardened by 005) against the
-- full operation-identity and atomic-completion matrix required by Engineering QA.
--
-- ═══ DO NOT RUN ON PRODUCTION ═══
-- RUN ONLY ON: DISPOSABLE TEST DATABASE or DEDICATED STAGING DATABASE
-- (This suite inserts/deletes synthetic rows and switches RLS roles. It must
--  never run against the production Supabase project.)
-- ══════════════════════════════
--
-- Run AFTER migrations 001..005 are applied. This is a psql script (it uses
-- \set / \gset / \echo meta-commands), so run it with the psql client — NOT by
-- pasting into the SQL Editor:
--   psql "$DATABASE_URL" -f supabase/tests/004_collision_matrix.sql
-- A clean run prints 19 PASS NOTICE lines then `R6 collision matrix: ALL PASS`
-- and exits 0. Any uncaught FAIL aborts with a non-zero exit — never a false
-- green (`\set ON_ERROR_STOP on` below).
--
-- ═══ Evidence honesty ═══
--   SCENARIO 14   = LOST_RESPONSE_EQUIVALENT_RETRY (first operation commits,
--                   then the client retries the SAME operation id). This is the
--                   equivalent-semantics path, NOT a real network response loss.
--   SCENARIO 15   = two DIFFERENT operations applied sequentially — it is NOT a
--                   concurrency test.  CONCURRENCY_RUNTIME = NOT_RUN.
--   SCENARIO 16   = PROFILE_NOT_FOUND raised BEFORE any write (early failure),
--                   NOT a mid-write rollback.  MID_WRITE_ROLLBACK_RUNTIME = NOT_RUN.
-- ═════════════════════
--
-- ═══ Repeatability ═══
--   All collision-relevant synthetic identifiers (user_id, operation id →
--   learning_record.id) are generated per-run with gen_random_uuid(), so the
--   suite can be re-run without fixed-PK collision. session_id / card_id are
--   TEXT (non-unique) columns and cannot collide.
--   Cleanup (DELETE by synthetic user_id, FK-respecting order) runs at the end;
--   if a FAIL aborts the script mid-way, cleanup may not run, which is exactly
--   why this suite is restricted to a disposable/staging DB.
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

-- Profiles must exist for the RPC (it raises PROFILE_NOT_FOUND otherwise).
-- Setup runs as the script owner (superuser), which bypasses RLS.
INSERT INTO user_profile (user_id) VALUES (:'ua') ON CONFLICT (user_id) DO NOTHING;
INSERT INTO user_profile (user_id) VALUES (:'ub') ON CONFLICT (user_id) DO NOTHING;

-- ═══ SCENARIO 1..12: USER_A, base payload = choice/true/{"selectedOptionId":"a"}/skip=false/difficulty=0.4 ═══
BEGIN;
  SET LOCAL "request.jwt.claim.sub" = :'ua';

  -- 1. first apply → APPLIED_NEW + evidence_applied=true
  DO $$
  DECLARE r jsonb;
  BEGIN
    r := apply_learning_evidence(:'op1','sess-1','card-1','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    IF r->>'status' IS DISTINCT FROM 'APPLIED_NEW' OR r->>'evidence_applied' IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'TEST 1 FAIL: %', r;
    END IF;
    RAISE NOTICE 'TEST 1 PASS (first apply)';
  END $$;

  -- 2. exact same payload retry → IDEMPOTENT_ALREADY_APPLIED, evidence not re-applied
  DO $$
  DECLARE r jsonb;
  BEGIN
    r := apply_learning_evidence(:'op1','sess-1','card-1','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    IF r->>'status' IS DISTINCT FROM 'IDEMPOTENT_ALREADY_APPLIED' OR r->>'evidence_applied' IS DISTINCT FROM 'false' THEN
      RAISE EXCEPTION 'TEST 2 FAIL: %', r;
    END IF;
    RAISE NOTICE 'TEST 2 PASS (exact retry idempotent)';
  END $$;
COMMIT;

-- 3..12: one field changed → LEARNING_OPERATION_ID_COLLISION.
DO $$
DECLARE r jsonb;
BEGIN
  SET LOCAL "request.jwt.claim.sub" = :'ua';

  -- 3. changed session_id (same operation id op1) → collision
  BEGIN
    r := apply_learning_evidence(:'op1','sess-OTHER','card-1','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    RAISE EXCEPTION 'TEST 3 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 3 PASS (changed session_id)';
    ELSE RAISE; END IF;
  END;

  -- 4. changed card_id → collision
  BEGIN
    r := apply_learning_evidence(:'op1','sess-1','card-OTHER','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    RAISE EXCEPTION 'TEST 4 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 4 PASS (changed card_id)';
    ELSE RAISE; END IF;
  END;

  -- 5. changed card_type → collision
  BEGIN
    r := apply_learning_evidence(:'op1','sess-1','card-1','reorder',true,'{"selectedOptionId":"a"}',false,0.4);
    RAISE EXCEPTION 'TEST 5 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 5 PASS (changed card_type)';
    ELSE RAISE; END IF;
  END;

  -- 6. changed correct → collision
  BEGIN
    r := apply_learning_evidence(:'op1','sess-1','card-1','choice',false,'{"selectedOptionId":"a"}',false,0.4);
    RAISE EXCEPTION 'TEST 6 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 6 PASS (changed correct)';
    ELSE RAISE; END IF;
  END;

  -- 7. changed user_answer (genuinely different) → collision
  BEGIN
    r := apply_learning_evidence(:'op1','sess-1','card-1','choice',true,'{"selectedOptionId":"b"}',false,0.4);
    RAISE EXCEPTION 'TEST 7 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 7 PASS (changed user_answer)';
    ELSE RAISE; END IF;
  END;

  -- 8. JSONB semantically-equal variant (key order/whitespace differ, equal value)
  --    → must be IDEMPOTENT, not collision (native jsonb equality).
  BEGIN
    r := apply_learning_evidence(:'op1','sess-1','card-1','choice',true,'{ "selectedOptionId" : "a" }',false,0.4);
    IF r->>'status' IS DISTINCT FROM 'IDEMPOTENT_ALREADY_APPLIED' THEN
      RAISE EXCEPTION 'TEST 8 FAIL: %', r;
    END IF;
    RAISE NOTICE 'TEST 8 PASS (jsonb semantically equal → idempotent)';
  END;

  -- 9. JSONB genuinely different (nested structure) → collision
  BEGIN
    r := apply_learning_evidence(:'op1','sess-1','card-1','choice',true,'{"selectedOptionId":"a","extra":1}',false,0.4);
    RAISE EXCEPTION 'TEST 9 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 9 PASS (jsonb genuinely different)';
    ELSE RAISE; END IF;
  END;

  -- 10. changed skip_evidence → collision
  BEGIN
    r := apply_learning_evidence(:'op1','sess-1','card-1','choice',true,'{"selectedOptionId":"a"}',true,0.4);
    RAISE EXCEPTION 'TEST 10 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 10 PASS (changed skip_evidence)';
    ELSE RAISE; END IF;
  END;

  -- 11. adjacent REAL difficulty (0.4 vs 0.4000001, distinct float4) → collision
  BEGIN
    r := apply_learning_evidence(:'op1','sess-1','card-1','choice',true,'{"selectedOptionId":"a"}',false,0.4000001);
    RAISE EXCEPTION 'TEST 11 FAIL: expected collision (REAL must not round), got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 11 PASS (adjacent REAL difficulty)';
    ELSE RAISE; END IF;
  END;

  -- 12. SQL NULL vs JSON 'null'::jsonb (distinct identities) → collision.
  BEGIN
    r := apply_learning_evidence(:'op12','sess-12','card-12','choice',true,NULL,false,0.4);
    IF r->>'status' IS DISTINCT FROM 'APPLIED_NEW' THEN
      RAISE EXCEPTION 'TEST 12 SETUP FAIL: %', r;
    END IF;
    r := apply_learning_evidence(:'op12','sess-12','card-12','choice',true,'null'::jsonb,false,0.4);
    RAISE EXCEPTION 'TEST 12 FAIL: expected collision (SQL NULL != json null), got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 12 PASS (SQL NULL vs json null)';
    ELSE RAISE; END IF;
  END;
END $$;

-- ═══ SCENARIO 13: direct client pre-insert attack → BLOCKED ═══
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'ua';
  DO $$
  BEGIN
    BEGIN
      INSERT INTO learning_record (id, user_id, session_id, card_type, card_id, correct, user_answer, skip_evidence, difficulty)
      VALUES (:'op2', :'ua', 'sess-x', 'choice', 'card-x', true, '{"selectedOptionId":"a"}', false, 0.4);
      RAISE EXCEPTION 'TEST 13 FAIL: direct pre-insert was NOT blocked';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST 13 PASS (direct pre-insert blocked)';
    END;
  END $$;
ROLLBACK;

-- ═══ SCENARIO 14: LOST_RESPONSE_EQUIVALENT_RETRY ═══
-- NOT a real network response loss: it proves that once the first operation
-- COMMITS, a later retry of the SAME operation id returns IDEMPOTENT and does
-- not re-apply evidence — the equivalent semantics of a lost-response retry.
BEGIN;
  SET LOCAL "request.jwt.claim.sub" = :'ua';
  DO $$
  DECLARE r1 jsonb;
  BEGIN
    r1 := apply_learning_evidence(:'op2','sess-2','card-2','reorder',false,'{"orderedChunkIds":["c","b","a"]}',false,0.6);
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
    r2 := apply_learning_evidence(:'op2','sess-2','card-2','reorder',false,'{"orderedChunkIds":["c","b","a"]}',false,0.6);
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
    r1 := apply_learning_evidence(:'op15a','sess-3','card-3','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    r2 := apply_learning_evidence(:'op15b','sess-3','card-4','choice',true,'{"selectedOptionId":"a"}',false,0.4);
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
      r := apply_learning_evidence(:'op16','sess-4','card-5','choice',true,'{"selectedOptionId":"a"}',false,0.4);
      RAISE EXCEPTION 'TEST 16 FAIL: expected PROFILE_NOT_FOUND, got %', r;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE '%PROFILE_NOT_FOUND%' THEN NULL; ELSE RAISE; END IF;
    END;
    IF EXISTS (SELECT 1 FROM learning_record WHERE id = :'op16') THEN
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
      r := apply_learning_evidence(:'op17','sess-5','card-6','choice',true,'{"selectedOptionId":"a"}',false,0.4);
      RAISE EXCEPTION 'TEST 17 FAIL: expected AUTH_REQUIRED, got %', r;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE '%AUTH_REQUIRED%' THEN RAISE NOTICE 'TEST 17 PASS (unauthenticated rejected)';
      ELSE RAISE; END IF;
    END;
  END $$;
COMMIT;

-- ═══ SCENARIO 18: cross-user same operation id → collision (not idempotent) ═══
BEGIN;
  SET LOCAL "request.jwt.claim.sub" = :'ub';
  DO $$
  DECLARE r jsonb;
  BEGIN
    -- op1 already belongs to USER_A. USER_B presents the SAME id + payload.
    BEGIN
      r := apply_learning_evidence(:'op1','sess-1','card-1','choice',true,'{"selectedOptionId":"a"}',false,0.4);
      RAISE EXCEPTION 'TEST 18 FAIL: expected collision (cross-user), got %', r;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 18 PASS (cross-user collision)';
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
