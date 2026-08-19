-- ============================================================
-- Exam OS — R6 atomic operation collision matrix (DB integration test)
--
-- Verifies apply_learning_evidence (migration 004, R6) against the full
-- operation-identity and atomic-completion matrix required by Engineering QA.
--
-- Run AFTER migrations 001..004 are applied. This is a psql script (it uses
-- \set / \echo meta-commands), so run it with the psql client against the
-- Supabase Postgres database:
--   psql "$DATABASE_URL" -f supabase/tests/004_collision_matrix.sql
--   (DATABASE_URL = Supabase Postgres connection string from Dashboard →
--    Settings → Database → Connection string. A clean run prints 18 PASS
--    NOTICE lines then `R6 collision matrix: ALL PASS`.)
--
-- Auth simulation: the RPC is SECURITY DEFINER, so it bypasses RLS, but
-- auth.uid() still reads the request JWT claim. This script sets
-- `request.jwt.claim.sub` (Supabase's auth.uid() primary source) to pick the
-- caller identity. If your Supabase version reads `request.jwt.claims`
-- (plural) instead, set that GUC to '{"sub":"<uuid>"}'.
--
-- Every scenario asserts via RAISE EXCEPTION on failure; a clean run prints
-- only "N PASS" NOTICE lines. Any FAIL aborts the transaction with a message.
-- ============================================================

-- ── Test fixtures (fixed UUIDs; auth.uid() only reads the claim, not auth.users) ──
\set USER_A '00000000-0000-0000-0000-000000000001'
\set USER_B '00000000-0000-0000-0000-000000000002'
\set OP1    '11111111-1111-1111-1111-111111111111'
\set OP2    '22222222-2222-2222-2222-222222222222'

-- Profiles must exist for the RPC (it raises PROFILE_NOT_FOUND otherwise).
-- Run as the script owner (postgres/superuser, which bypasses RLS) for setup.
INSERT INTO user_profile (user_id) VALUES (:'USER_A') ON CONFLICT (user_id) DO NOTHING;
INSERT INTO user_profile (user_id) VALUES (:'USER_B') ON CONFLICT (user_id) DO NOTHING;

-- ═══ SCENARIO 1..14: USER_A, base payload = choice/true/{"selectedOptionId":"a"}/skip=false/difficulty=0.4 ═══
BEGIN;
  SET LOCAL "request.jwt.claim.sub" = :'USER_A';

  -- 1. first apply → APPLIED_NEW + evidence_applied=true
  DO $$
  DECLARE r jsonb;
  BEGIN
    r := apply_learning_evidence(:'OP1','sess-1','card-1','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    IF r->>'status' IS DISTINCT FROM 'APPLIED_NEW' OR r->>'evidence_applied' IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'TEST 1 FAIL: %', r;
    END IF;
    RAISE NOTICE 'TEST 1 PASS (first apply)';
  END $$;

  -- 2. exact same payload retry → IDEMPOTENT_ALREADY_APPLIED, evidence not re-applied
  DO $$
  DECLARE r jsonb;
  BEGIN
    r := apply_learning_evidence(:'OP1','sess-1','card-1','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    IF r->>'status' IS DISTINCT FROM 'IDEMPOTENT_ALREADY_APPLIED' OR r->>'evidence_applied' IS DISTINCT FROM 'false' THEN
      RAISE EXCEPTION 'TEST 2 FAIL: %', r;
    END IF;
    RAISE NOTICE 'TEST 2 PASS (exact retry idempotent)';
  END $$;
COMMIT;

-- 3..12: one field changed → LEARNING_OPERATION_ID_COLLISION.
-- Each uses a FRESH operation id (or a distinct session/card) to avoid
-- colliding with the committed OP1; the point is the payload mismatch.
DO $$
DECLARE r jsonb;
BEGIN
  SET LOCAL "request.jwt.claim.sub" = :'USER_A';

  -- 3. changed session_id (same operation id OP1) → collision
  BEGIN
    r := apply_learning_evidence(:'OP1','sess-OTHER','card-1','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    RAISE EXCEPTION 'TEST 3 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 3 PASS (changed session_id)';
    ELSE RAISE; END IF;
  END;

  -- 4. changed card_id → collision
  BEGIN
    r := apply_learning_evidence(:'OP1','sess-1','card-OTHER','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    RAISE EXCEPTION 'TEST 4 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 4 PASS (changed card_id)';
    ELSE RAISE; END IF;
  END;

  -- 5. changed card_type → collision
  BEGIN
    r := apply_learning_evidence(:'OP1','sess-1','card-1','reorder',true,'{"selectedOptionId":"a"}',false,0.4);
    RAISE EXCEPTION 'TEST 5 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 5 PASS (changed card_type)';
    ELSE RAISE; END IF;
  END;

  -- 6. changed correct → collision
  BEGIN
    r := apply_learning_evidence(:'OP1','sess-1','card-1','choice',false,'{"selectedOptionId":"a"}',false,0.4);
    RAISE EXCEPTION 'TEST 6 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 6 PASS (changed correct)';
    ELSE RAISE; END IF;
  END;

  -- 7. changed user_answer (genuinely different) → collision
  BEGIN
    r := apply_learning_evidence(:'OP1','sess-1','card-1','choice',true,'{"selectedOptionId":"b"}',false,0.4);
    RAISE EXCEPTION 'TEST 7 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 7 PASS (changed user_answer)';
    ELSE RAISE; END IF;
  END;

  -- 8. JSONB semantically-equal variant (key order/whitespace differ, equal value)
  --    → must be IDEMPOTENT, not collision (native jsonb equality).
  BEGIN
    r := apply_learning_evidence(:'OP1','sess-1','card-1','choice',true,'{ "selectedOptionId" : "a" }',false,0.4);
    IF r->>'status' IS DISTINCT FROM 'IDEMPOTENT_ALREADY_APPLIED' THEN
      RAISE EXCEPTION 'TEST 8 FAIL: %', r;
    END IF;
    RAISE NOTICE 'TEST 8 PASS (jsonb semantically equal → idempotent)';
  END;

  -- 9. JSONB genuinely different (nested structure) → collision
  BEGIN
    r := apply_learning_evidence(:'OP1','sess-1','card-1','choice',true,'{"selectedOptionId":"a","extra":1}',false,0.4);
    RAISE EXCEPTION 'TEST 9 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 9 PASS (jsonb genuinely different)';
    ELSE RAISE; END IF;
  END;

  -- 10. changed skip_evidence → collision
  BEGIN
    r := apply_learning_evidence(:'OP1','sess-1','card-1','choice',true,'{"selectedOptionId":"a"}',true,0.4);
    RAISE EXCEPTION 'TEST 10 FAIL: expected collision, got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 10 PASS (changed skip_evidence)';
    ELSE RAISE; END IF;
  END;

  -- 11. adjacent REAL difficulty (0.4 vs 0.4000001, distinct float4) → collision
  BEGIN
    r := apply_learning_evidence(:'OP1','sess-1','card-1','choice',true,'{"selectedOptionId":"a"}',false,0.4000001);
    RAISE EXCEPTION 'TEST 11 FAIL: expected collision (REAL must not round), got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 11 PASS (adjacent REAL difficulty)';
    ELSE RAISE; END IF;
  END;

  -- 12. SQL NULL vs JSON 'null'::jsonb (distinct identities) → collision.
  -- First apply with a genuine SQL NULL user_answer, then retry the SAME
  -- operation id with the JSON null literal: native typed comparison must
  -- treat them as distinct (IS NOT DISTINCT FROM keeps SQL NULL ≠ jsonb 'null').
  BEGIN
    r := apply_learning_evidence('12121212-1212-1212-1212-121212121212','sess-12','card-12','choice',true,NULL,false,0.4);
    IF r->>'status' IS DISTINCT FROM 'APPLIED_NEW' THEN
      RAISE EXCEPTION 'TEST 12 SETUP FAIL: %', r;
    END IF;
    r := apply_learning_evidence('12121212-1212-1212-1212-121212121212','sess-12','card-12','choice',true,'null'::jsonb,false,0.4);
    RAISE EXCEPTION 'TEST 12 FAIL: expected collision (SQL NULL != json null), got %', r;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 12 PASS (SQL NULL vs json null)';
    ELSE RAISE; END IF;
  END;
END $$;

-- ═══ SCENARIO 13: direct client pre-insert attack → BLOCKED ═══
-- As the authenticated client (subject to RLS), a direct INSERT into
-- learning_record must now fail (INSERT policy removed in R6).
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = :'USER_A';
  DO $$
  BEGIN
    BEGIN
      INSERT INTO learning_record (id, user_id, session_id, card_type, card_id, correct, user_answer, skip_evidence, difficulty)
      VALUES (:'OP2', :'USER_A', 'sess-x', 'choice', 'card-x', true, '{"selectedOptionId":"a"}', false, 0.4);
      RAISE EXCEPTION 'TEST 13 FAIL: direct pre-insert was NOT blocked';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST 13 PASS (direct pre-insert blocked)';
    END;
  END $$;
ROLLBACK;

-- ═══ SCENARIO 14: lost-response-equivalent retry (fresh apply then retry) ═══
BEGIN;
  SET LOCAL "request.jwt.claim.sub" = :'USER_A';
  DO $$
  DECLARE r jsonb;
  BEGIN
    PERFORM apply_learning_evidence(:'OP2','sess-2','card-2','reorder',false,'{"orderedChunkIds":["c","b","a"]}',false,0.6);
    r := apply_learning_evidence(:'OP2','sess-2','card-2','reorder',false,'{"orderedChunkIds":["c","b","a"]}',false,0.6);
    IF r->>'status' IS DISTINCT FROM 'IDEMPOTENT_ALREADY_APPLIED' THEN
      RAISE EXCEPTION 'TEST 14 FAIL: %', r;
    END IF;
    RAISE NOTICE 'TEST 14 PASS (lost-response retry idempotent)';
  END $$;
COMMIT;

-- ═══ SCENARIO 15: different operation IDs (same user) both apply ═══
BEGIN;
  SET LOCAL "request.jwt.claim.sub" = :'USER_A';
  DO $$
  DECLARE r1 jsonb; r2 jsonb;
  BEGIN
    r1 := apply_learning_evidence('33333333-3333-3333-3333-333333333333','sess-3','card-3','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    r2 := apply_learning_evidence('44444444-4444-4444-4444-444444444444','sess-3','card-4','choice',true,'{"selectedOptionId":"a"}',false,0.4);
    IF r1->>'status' IS DISTINCT FROM 'APPLIED_NEW' OR r2->>'status' IS DISTINCT FROM 'APPLIED_NEW' THEN
      RAISE EXCEPTION 'TEST 15 FAIL: % / %', r1, r2;
    END IF;
    RAISE NOTICE 'TEST 15 PASS (distinct operation ids both apply)';
  END $$;
COMMIT;

-- ═══ SCENARIO 16: rollback on profile failure (no partial state) ═══
-- A user with NO profile row → PROFILE_NOT_FOUND, and learning_record must not
-- be left behind.
BEGIN;
  SET LOCAL "request.jwt.claim.sub" = '55555555-5555-5555-5555-555555555555';
  DO $$
  DECLARE r jsonb;
  BEGIN
    BEGIN
      r := apply_learning_evidence('66666666-6666-6666-6666-666666666666','sess-4','card-5','choice',true,'{"selectedOptionId":"a"}',false,0.4);
      RAISE EXCEPTION 'TEST 16 FAIL: expected PROFILE_NOT_FOUND, got %', r;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE '%PROFILE_NOT_FOUND%' THEN NULL; ELSE RAISE; END IF;
    END;
    IF EXISTS (SELECT 1 FROM learning_record WHERE id = '66666666-6666-6666-6666-666666666666') THEN
      RAISE EXCEPTION 'TEST 16 FAIL: learning_record was not rolled back';
    END IF;
    RAISE NOTICE 'TEST 16 PASS (rollback on profile failure)';
  END $$;
COMMIT;

-- ═══ SCENARIO 17: unauthenticated → AUTH_REQUIRED ═══
BEGIN;
  SET LOCAL "request.jwt.claim.sub" = '';  -- no identity
  DO $$
  DECLARE r jsonb;
  BEGIN
    BEGIN
      r := apply_learning_evidence('77777777-7777-7777-7777-777777777777','sess-5','card-6','choice',true,'{"selectedOptionId":"a"}',false,0.4);
      RAISE EXCEPTION 'TEST 17 FAIL: expected AUTH_REQUIRED, got %', r;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE '%AUTH_REQUIRED%' THEN RAISE NOTICE 'TEST 17 PASS (unauthenticated rejected)';
      ELSE RAISE; END IF;
    END;
  END $$;
COMMIT;

-- ═══ SCENARIO 18: cross-user same operation id → collision (not idempotent) ═══
BEGIN;
  SET LOCAL "request.jwt.claim.sub" = :'USER_B';
  DO $$
  DECLARE r jsonb;
  BEGIN
    -- OP1 already belongs to USER_A. USER_B presents the SAME id + payload.
    BEGIN
      r := apply_learning_evidence(:'OP1','sess-1','card-1','choice',true,'{"selectedOptionId":"a"}',false,0.4);
      RAISE EXCEPTION 'TEST 18 FAIL: expected collision (cross-user), got %', r;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE '%LEARNING_OPERATION_ID_COLLISION%' THEN RAISE NOTICE 'TEST 18 PASS (cross-user collision)';
      ELSE RAISE; END IF;
    END;
  END $$;
COMMIT;

-- ═══ END: all scenarios passed (any FAIL would have raised) ═══
\echo 'R6 collision matrix: ALL PASS'
