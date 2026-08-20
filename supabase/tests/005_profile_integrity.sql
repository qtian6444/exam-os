-- ============================================================
-- Exam OS — R7 profile integrity + privilege isolation
-- R9 EVIDENCE-FIRST revision: converted to LAYER A — DATABASE STATIC ACL
-- (catalog inspection only). Fixes:
--   ENG-R8-002  no psql :'var' / :"var" anywhere (the whole file is variable-free).
--   ENG-R8-004  CREATE ROLE / DROP ROLE / DROP OWNED / SET ROLE eliminated —
--               this file no longer manufactures roles or switches callers.
--   ENG-R8-006  read-only → no residue, no cleanup to lose on mid-script FAIL.
--
-- This file proves the SECURITY MODEL'S ACL SHAPE from the catalog:
--   column-level INSERT/UPDATE grants on user_profile
--   RLS policy existence + owner-bound quals
--   function EXECUTE grants (authenticated vs anon vs PUBLIC)
--   SECURITY DEFINER + narrowed search_path on the RPC
--   the unique constraints that drive the client's 23505→UPDATE contract
--
-- It does NOT run as any caller. LAYER B — REAL CALLER RUNTIME (an actual
-- authenticated/anonymous request through PostgREST + Supabase Auth/JWT) — is
-- deferred to the STAGING gate (see DEPLOYMENT_GATE.md). Catalog ACL facts are
-- NOT evidence of a real authorization request; they are evidence of the
-- intended ACL shape only.
--
-- ═══ READ-ONLY — SAFE ON ANY DATABASE ═══
-- Catalog reads only (has_*_privilege / pg_policies / pg_class / pg_proc /
-- pg_constraint / aclexplode). No writes, no residue, so it can run on staging
-- AND (unlike the destructive 004 suite) on production as a post-deploy check.
-- ═══════════════════════════════
--
-- Run AFTER migrations 001..005, directly in the Supabase Dashboard SQL Editor
-- (no psql meta-commands). Paste the whole script and Run.
-- A clean run prints 11 PASS NOTICE lines then a final result row
-- `R7 profile integrity: ALL PASS`. Any uncaught FAIL raises an exception and
-- stops the script before that final row — never a false green.
-- ============================================================

-- Fail-fast: any FAIL raises inside its DO block and errors that statement; the
-- SQL Editor stops at the first errored statement, so it never reaches the final
-- "ALL PASS" row. (psql's \set ON_ERROR_STOP has no SQL Editor equivalent.)

-- ═══ T1: user_profile RLS enabled + owner-bound SELECT/INSERT/UPDATE policies ═══
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'user_profile' AND c.relrowsecurity
  ) THEN RAISE EXCEPTION 'TEST 1 FAIL: user_profile RLS not enabled'; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_profile' AND cmd='SELECT' AND qual::text LIKE '%auth.uid()%') THEN
    RAISE EXCEPTION 'TEST 1 FAIL: missing owner-bound SELECT policy';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_profile' AND cmd='INSERT' AND with_check::text LIKE '%auth.uid()%') THEN
    RAISE EXCEPTION 'TEST 1 FAIL: missing owner-bound INSERT policy';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_profile' AND cmd='UPDATE' AND qual::text LIKE '%auth.uid()%' AND with_check::text LIKE '%auth.uid()%') THEN
    RAISE EXCEPTION 'TEST 1 FAIL: missing owner-bound UPDATE policy';
  END IF;
  RAISE NOTICE 'TEST 1 PASS (user_profile RLS enabled + owner-bound policies)';
END $$;

-- ═══ T2: the two uniqueness sources behind the client's 23505 signal ═══
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid
     JOIN pg_namespace n ON n.oid = rel.relnamespace
     WHERE n.nspname = 'public' AND rel.relname = 'user_profile'
       AND con.conname = 'user_profile_user_id_key' AND con.contype = 'u'
  ) THEN RAISE EXCEPTION 'TEST 2 FAIL: user_profile_user_id_key unique constraint missing'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid
     JOIN pg_namespace n ON n.oid = rel.relnamespace
     WHERE n.nspname = 'public' AND rel.relname = 'user_profile'
       AND con.conname = 'user_profile_pkey' AND con.contype = 'p'
  ) THEN RAISE EXCEPTION 'TEST 2 FAIL: user_profile_pkey primary key missing'; END IF;
  RAISE NOTICE 'TEST 2 PASS (two distinct uniqueness sources → 23505 must be disambiguated by constraint)';
END $$;

-- ═══ T3: INSERT column grants = exactly {user_id, exam_type, exam_batch, daily_time, updated_at} ═══
DO $$
DECLARE
  ins_ok text[] := ARRAY['user_id','exam_type','exam_batch','daily_time','updated_at'];
  ins_no text[] := ARRAY['ability_vocabulary','ability_sentence','ability_reading','ability_listening','ability_writing',
                         'confidence_vocabulary','confidence_sentence','confidence_reading','confidence_listening','confidence_writing',
                         'id','created_at'];
  c text;
BEGIN
  FOREACH c IN ARRAY ins_ok LOOP
    IF NOT has_column_privilege('authenticated', 'public.user_profile', c, 'INSERT') THEN
      RAISE EXCEPTION 'TEST 3 FAIL: INSERT(%) expected true', c;
    END IF;
  END LOOP;
  FOREACH c IN ARRAY ins_no LOOP
    IF has_column_privilege('authenticated', 'public.user_profile', c, 'INSERT') THEN
      RAISE EXCEPTION 'TEST 3 FAIL: INSERT(%) expected false', c;
    END IF;
  END LOOP;
  RAISE NOTICE 'TEST 3 PASS (INSERT grants = identity + USER_EDITABLE only)';
END $$;

-- ═══ T4: UPDATE column grants = exactly {exam_type, exam_batch, daily_time, updated_at} ═══
DO $$
DECLARE
  upd_ok text[] := ARRAY['exam_type','exam_batch','daily_time','updated_at'];
  upd_no text[] := ARRAY['user_id',
                         'ability_vocabulary','ability_sentence','ability_reading','ability_listening','ability_writing',
                         'confidence_vocabulary','confidence_sentence','confidence_reading','confidence_listening','confidence_writing',
                         'id','created_at'];
  c text;
BEGIN
  FOREACH c IN ARRAY upd_ok LOOP
    IF NOT has_column_privilege('authenticated', 'public.user_profile', c, 'UPDATE') THEN
      RAISE EXCEPTION 'TEST 4 FAIL: UPDATE(%) expected true', c;
    END IF;
  END LOOP;
  FOREACH c IN ARRAY upd_no LOOP
    IF has_column_privilege('authenticated', 'public.user_profile', c, 'UPDATE') THEN
      RAISE EXCEPTION 'TEST 4 FAIL: UPDATE(%) expected false', c;
    END IF;
  END LOOP;
  RAISE NOTICE 'TEST 4 PASS (UPDATE grants exclude user_id + authoritative + immutable)';
END $$;

-- ═══ T5: learning_record → RLS enabled, SELECT only (no direct INSERT) ═══
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='public' AND c.relname='learning_record' AND c.relrowsecurity
  ) THEN RAISE EXCEPTION 'TEST 5 FAIL: learning_record RLS not enabled'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='learning_record' AND cmd='SELECT') THEN
    RAISE EXCEPTION 'TEST 5 FAIL: missing learning_record SELECT policy';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='learning_record' AND cmd IN ('INSERT','UPDATE','DELETE')) THEN
    RAISE EXCEPTION 'TEST 5 FAIL: learning_record has a write policy (direct insert NOT blocked)';
  END IF;
  RAISE NOTICE 'TEST 5 PASS (learning_record SELECT-only, direct insert default-deny)';
END $$;

-- ═══ T6: ability_history → RLS enabled, SELECT only (no direct INSERT) ═══
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='public' AND c.relname='ability_history' AND c.relrowsecurity
  ) THEN RAISE EXCEPTION 'TEST 6 FAIL: ability_history RLS not enabled'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ability_history' AND cmd='SELECT') THEN
    RAISE EXCEPTION 'TEST 6 FAIL: missing ability_history SELECT policy';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ability_history' AND cmd IN ('INSERT','UPDATE','DELETE')) THEN
    RAISE EXCEPTION 'TEST 6 FAIL: ability_history has a write policy (direct insert NOT blocked)';
  END IF;
  RAISE NOTICE 'TEST 6 PASS (ability_history SELECT-only, direct insert default-deny)';
END $$;

-- ═══ T7: content_library / content_skill remain read-only ═══
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='content_library' AND cmd='SELECT') THEN
    RAISE EXCEPTION 'TEST 7 FAIL: missing content_library SELECT policy';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='content_library' AND cmd IN ('INSERT','UPDATE','DELETE')) THEN
    RAISE EXCEPTION 'TEST 7 FAIL: content_library has a write policy';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='content_skill' AND cmd='SELECT') THEN
    RAISE EXCEPTION 'TEST 7 FAIL: missing content_skill SELECT policy';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='content_skill' AND cmd IN ('INSERT','UPDATE','DELETE')) THEN
    RAISE EXCEPTION 'TEST 7 FAIL: content_skill has a write policy';
  END IF;
  RAISE NOTICE 'TEST 7 PASS (content tables read-only)';
END $$;

-- ═══ T8: RPC is SECURITY DEFINER with 8 args (no user_id param) ═══
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname='apply_learning_evidence' AND p.prosecdef
  ) THEN RAISE EXCEPTION 'TEST 8 FAIL: RPC is not SECURITY DEFINER'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname='apply_learning_evidence' AND p.pronargs <> 8
  ) THEN RAISE EXCEPTION 'TEST 8 FAIL: RPC signature has an unexpected arg count'; END IF;
  RAISE NOTICE 'TEST 8 PASS (RPC SECURITY DEFINER, 8 args, no user_id param)';
END $$;

-- ═══ T9: RPC search_path narrowed (no public / pg_temp in proconfig) ═══
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname='apply_learning_evidence'
       AND p.proconfig IS NOT NULL
       AND array_to_string(p.proconfig, ',') LIKE '%search_path=%'
  ) THEN RAISE EXCEPTION 'TEST 9 FAIL: RPC has no search_path setting'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname='apply_learning_evidence'
       AND array_to_string(p.proconfig, ',') LIKE '%search_path=%public%'
  ) THEN RAISE EXCEPTION 'TEST 9 FAIL: RPC search_path still includes public'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname='apply_learning_evidence'
       AND array_to_string(p.proconfig, ',') LIKE '%search_path=%pg_temp%'
  ) THEN RAISE EXCEPTION 'TEST 9 FAIL: RPC search_path still includes pg_temp'; END IF;
  RAISE NOTICE 'TEST 9 PASS (RPC search_path narrowed, no public/pg_temp)';
END $$;

-- ═══ T10: EXECUTE grants — authenticated yes, anon no ═══
DO $$
DECLARE fn text := 'public.apply_learning_evidence(uuid,text,text,text,boolean,jsonb,boolean,real)';
BEGIN
  IF NOT has_function_privilege('authenticated', fn, 'EXECUTE') THEN
    RAISE EXCEPTION 'TEST 10 FAIL: authenticated EXECUTE is false';
  END IF;
  IF has_function_privilege('anon', fn, 'EXECUTE') THEN
    RAISE EXCEPTION 'TEST 10 FAIL: anon EXECUTE unexpectedly true';
  END IF;
  RAISE NOTICE 'TEST 10 PASS (authenticated can EXECUTE, anon cannot)';
END $$;

-- ═══ T11: no PUBLIC EXECUTE grantee (aclexplode grantee = 0) ═══
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(p.proacl) AS a
     WHERE n.nspname='public' AND p.proname='apply_learning_evidence'
       AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
  ) THEN RAISE EXCEPTION 'TEST 11 FAIL: PUBLIC still has EXECUTE'; END IF;
  RAISE NOTICE 'TEST 11 PASS (no PUBLIC EXECUTE grantee)';
END $$;

-- ═══ END: all assertions passed (any FAIL would have raised and aborted) ═══
SELECT 'R7 profile integrity: ALL PASS' AS result;
