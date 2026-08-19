-- ============================================================
-- Exam OS — P0-SECURITY-R6: Atomic learning evidence transaction
--
-- Closes ENG-R3-004 (atomic write) and the R5 Engineering QA blockers
-- ENG-R5-001..004.
--
-- A learning event applies its ability evidence exactly once, inside ONE
-- transaction that writes learning_record + ability_history + user_profile:
--   - retry-safe            (SCENARIO B)
--   - lost-response-safe    (SCENARIO B)
--   - concurrent-safe       (SCENARIO E / F)
--   - no duplicate apply    (SCENARIO A / B / E)
--   - no lost update        (SCENARIO F)
--   - no sixth core table   (function only, no new table)
--
-- R6 operation identity = TYPED FIELD COMPARISON (not a hash fingerprint):
--   - difficulty compared with native REAL/float4 semantics (no round/truncate)
--   - user_answer compared with native jsonb equality (no text
--     canonicalization, no delimiter ambiguity, SQL NULL != json 'null')
--   - NULL handled by IS NOT DISTINCT FROM
--   - no pgcrypto / digest dependency
--
-- R6 atomic-completion proof:
--   Direct client INSERT on learning_record / ability_history is REMOVED
--   (policies dropped below). The RPC is SECURITY DEFINER so it can still
--   write them, and it is now the ONLY writer. Because the RPC writes all
--   three tables in one transaction, "a learning_record row exists" proves
--   the whole operation committed — a forged/pre-inserted record can no
--   longer masquerade as IDEMPOTENT_ALREADY_APPLIED.
--
-- SECURITY DEFINER is tightly scoped: the owner is auth.uid() (read from the
-- request JWT, independent of the function owner); there is no user_id
-- parameter, so the function cannot be directed at another user's rows.
-- No service_role, no cross-user write path.
--
-- Run via Supabase SQL Editor (or `supabase db push`).
-- ============================================================

-- ── ability_history: one evidence row per (record, ability) ──
-- Gives the atomic path a deterministic uniqueness boundary so an
-- unexpected duplicate for a freshly-inserted learning_record is
-- detectable and hard-fails (never silently skips the profile update).
-- Existing data already satisfies this (the legacy deterministic PK
-- keyed on (learning_record_id, ability_key)).
ALTER TABLE ability_history
  ADD CONSTRAINT ability_history_record_ability_unique
  UNIQUE (learning_record_id, ability_key);

-- ── learning_record: persist the full authoritative logical payload ──
-- The duplicate-operation-id branch re-derives identity by comparing the
-- PERSISTED authoritative fields against the incoming parameters with native
-- PostgreSQL typed semantics. skip_evidence and difficulty were not previously
-- stored, so they are added here. Nullable: pre-existing legacy rows keep NULL,
-- which never matches a validated incoming value (safe hard-fail on retry).
ALTER TABLE learning_record
  ADD COLUMN skip_evidence BOOLEAN;
ALTER TABLE learning_record
  ADD COLUMN difficulty REAL;

-- ── Remove direct client write paths to the authoritative operation tables ──
-- The client may no longer INSERT learning_record / ability_history directly;
-- only the SECURITY DEFINER RPC can (bypassing RLS), so a row's existence
-- proves the full atomic apply ran. SELECT (read) policies remain for the
-- client, and user_profile SELECT/INSERT/UPDATE remain for onboarding.
DROP POLICY IF EXISTS "learning_record_insert_own" ON learning_record;
DROP POLICY IF EXISTS "ability_history_insert_own" ON ability_history;

-- ── RPC ──
CREATE OR REPLACE FUNCTION apply_learning_evidence(
  p_operation_id  uuid,
  p_session_id    text,
  p_card_id       text,
  p_card_type     text,
  p_correct       boolean,
  p_user_answer   jsonb,
  p_skip_evidence boolean,
  p_difficulty    real
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid               text := (auth.uid())::text;
  v_profile           user_profile%ROWTYPE;
  v_record            learning_record%ROWTYPE;
  v_existing          learning_record%ROWTYPE;
  v_ew                real;
  v_score_before      real;
  v_conf_before       real;
  v_score_after       real;
  v_conf_after        real;
  v_new_sentence      real;
  v_new_sentence_conf real;
  v_new_reading       real;
  v_new_reading_conf  real;
  v_history_id        uuid;
BEGIN
  -- STEP 1 — auth identity. The real owner is auth.uid() (read from the
  -- request JWT, independent of SECURITY DEFINER). There is deliberately no
  -- user_id param, so the payload cannot name another user.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000';
  END IF;

  -- STEP 2 — validate payload. Reject NULL identity, bad enum, out-of-range
  -- numeric, clearly incomplete payload.
  IF p_operation_id IS NULL
     OR p_session_id IS NULL OR p_session_id = ''
     OR p_card_id IS NULL OR p_card_id = ''
     OR p_card_type IS NULL THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD' USING ERRCODE = '22023';
  END IF;
  IF p_card_type NOT IN ('choice', 'reading_breakdown', 'reorder') THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD' USING ERRCODE = '22023';
  END IF;
  IF p_difficulty IS NULL OR p_difficulty < 0 OR p_difficulty > 1 THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD' USING ERRCODE = '22023';
  END IF;

  -- STEP 3 — serialize this user's ability read-modify-write. FOR UPDATE
  -- takes a row lock so two different learning operations for the same
  -- user cannot both compute from the same stale snapshot (SCENARIO F),
  -- and the second writer observes the first writer's committed state.
  SELECT * INTO v_profile
    FROM user_profile
   WHERE user_id = v_uid
   FOR UPDATE;

  IF NOT FOUND THEN
    -- SCENARIO I: no profile row → the whole event must roll back, so
    -- the learning_record must NOT be left behind either.
    RAISE EXCEPTION 'PROFILE_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  -- STEP 4 — learning_record idempotency via the deterministic operation id.
  INSERT INTO learning_record
    (id, user_id, session_id, content_id, card_type, card_id, correct, user_answer, skip_evidence, difficulty)
  VALUES
    (p_operation_id, v_uid, p_session_id, NULL, p_card_type, p_card_id, p_correct, p_user_answer, p_skip_evidence, p_difficulty)
  ON CONFLICT (id) DO NOTHING
  RETURNING * INTO v_record;

  IF NOT FOUND THEN
    -- PK already present → either a retry of a fully-committed operation
    -- (response lost), or a genuine id collision.
    SELECT * INTO v_existing FROM learning_record WHERE id = p_operation_id;

    IF v_existing.id IS NOT NULL
       AND v_existing.user_id = v_uid
       AND v_existing.session_id IS NOT DISTINCT FROM p_session_id
       AND v_existing.card_id IS NOT DISTINCT FROM p_card_id
       AND v_existing.card_type IS NOT DISTINCT FROM p_card_type
       AND v_existing.correct IS NOT DISTINCT FROM p_correct
       AND v_existing.user_answer IS NOT DISTINCT FROM p_user_answer
       AND v_existing.skip_evidence IS NOT DISTINCT FROM p_skip_evidence
       AND v_existing.difficulty IS NOT DISTINCT FROM p_difficulty THEN
      -- SCENARIO B / H: same logical operation — every authoritative field
      -- matches under native typed equality (float4 for REAL, jsonb equality
      -- for user_answer, IS NOT DISTINCT FROM for NULL). Because the RPC is
      -- the only writer and it applies ability_history + user_profile in the
      -- SAME transaction, their presence is implied; do NOT apply again.
      RETURN jsonb_build_object(
        'status', 'IDEMPOTENT_ALREADY_APPLIED',
        'learning_record_id', v_existing.id::text,
        'evidence_applied', false
      );
    ELSE
      -- SCENARIO G / H: same PK but a DIFFERENT logical payload (any
      -- authoritative field differs under native typed equality), or a
      -- cross-user row (user_id mismatch). Hard-fail, never swallow.
      RAISE EXCEPTION 'LEARNING_OPERATION_ID_COLLISION' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- STEP 5 + 6 — ability evidence (only when this card produces evidence).
  -- Replicates the legacy `shouldSkipEvidence && correct !== null` gate.
  IF p_skip_evidence OR p_correct IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'APPLIED_NEW',
      'learning_record_id', v_record.id::text,
      'evidence_applied', false
    );
  END IF;

  -- Work from the locked authoritative snapshot.
  v_new_sentence       := v_profile.ability_sentence;
  v_new_sentence_conf  := v_profile.confidence_sentence;
  v_new_reading        := v_profile.ability_reading;
  v_new_reading_conf   := v_profile.confidence_reading;

  -- Replicate ability.ts computeEvidence semantics (do NOT change the
  -- algorithm, weights, or mastery decision):
  --   choice  → sentence(0.5) + reading(0.5)
  --   reorder → sentence(1.0)
  --   constants [C]: LEARNING_RATE 0.3, PENALTY_RATE 0.15, CONFIDENCE_GAIN 0.1
  --   evidenceWeight = clamp(difficulty * weight)
  --   correct: scoreAfter = scoreBefore + ew * (1 - scoreBefore) * 0.3
  --   wrong:   scoreAfter = scoreBefore - ew * scoreBefore * 0.15
  --   confidenceAfter = clamp(confidenceBefore + ew * 0.1)

  IF p_card_type = 'choice' THEN
    -- sentence (weight 0.5)
    v_ew           := LEAST(1, GREATEST(0, p_difficulty * 0.5));
    v_score_before := v_profile.ability_sentence;
    v_conf_before  := v_profile.confidence_sentence;
    IF p_correct THEN
      v_score_after := v_score_before + v_ew * (1 - v_score_before) * 0.3;
    ELSE
      v_score_after := v_score_before - v_ew * v_score_before * 0.15;
    END IF;
    v_score_after := LEAST(1, GREATEST(0, v_score_after));
    v_conf_after  := LEAST(1, GREATEST(0, v_conf_before + v_ew * 0.1));

    INSERT INTO ability_history
      (id, user_id, learning_record_id, ability_key, evidence_weight, correct,
       score_before, score_after, confidence_before, confidence_after)
    VALUES
      (gen_random_uuid(), v_uid, v_record.id, 'sentence', v_ew, p_correct,
       v_score_before, v_score_after, v_conf_before, v_conf_after)
    ON CONFLICT (learning_record_id, ability_key) DO NOTHING
    RETURNING id INTO v_history_id;

    IF v_history_id IS NULL THEN
      -- SCENARIO (abnormal): a freshly-inserted learning_record already has a
      -- history row → inconsistent atomic state. Hard-fail, roll back.
      RAISE EXCEPTION 'ATOMIC_STATE_CONFLICT' USING ERRCODE = 'P0001';
    END IF;

    v_new_sentence      := v_score_after;
    v_new_sentence_conf := v_conf_after;

    -- reading (weight 0.5)
    v_ew           := LEAST(1, GREATEST(0, p_difficulty * 0.5));
    v_score_before := v_profile.ability_reading;
    v_conf_before  := v_profile.confidence_reading;
    IF p_correct THEN
      v_score_after := v_score_before + v_ew * (1 - v_score_before) * 0.3;
    ELSE
      v_score_after := v_score_before - v_ew * v_score_before * 0.15;
    END IF;
    v_score_after := LEAST(1, GREATEST(0, v_score_after));
    v_conf_after  := LEAST(1, GREATEST(0, v_conf_before + v_ew * 0.1));

    INSERT INTO ability_history
      (id, user_id, learning_record_id, ability_key, evidence_weight, correct,
       score_before, score_after, confidence_before, confidence_after)
    VALUES
      (gen_random_uuid(), v_uid, v_record.id, 'reading', v_ew, p_correct,
       v_score_before, v_score_after, v_conf_before, v_conf_after)
    ON CONFLICT (learning_record_id, ability_key) DO NOTHING
    RETURNING id INTO v_history_id;

    IF v_history_id IS NULL THEN
      RAISE EXCEPTION 'ATOMIC_STATE_CONFLICT' USING ERRCODE = 'P0001';
    END IF;

    v_new_reading      := v_score_after;
    v_new_reading_conf := v_conf_after;

  ELSIF p_card_type = 'reorder' THEN
    -- sentence (weight 1.0)
    v_ew           := LEAST(1, GREATEST(0, p_difficulty * 1.0));
    v_score_before := v_profile.ability_sentence;
    v_conf_before  := v_profile.confidence_sentence;
    IF p_correct THEN
      v_score_after := v_score_before + v_ew * (1 - v_score_before) * 0.3;
    ELSE
      v_score_after := v_score_before - v_ew * v_score_before * 0.15;
    END IF;
    v_score_after := LEAST(1, GREATEST(0, v_score_after));
    v_conf_after  := LEAST(1, GREATEST(0, v_conf_before + v_ew * 0.1));

    INSERT INTO ability_history
      (id, user_id, learning_record_id, ability_key, evidence_weight, correct,
       score_before, score_after, confidence_before, confidence_after)
    VALUES
      (gen_random_uuid(), v_uid, v_record.id, 'sentence', v_ew, p_correct,
       v_score_before, v_score_after, v_conf_before, v_conf_after)
    ON CONFLICT (learning_record_id, ability_key) DO NOTHING
    RETURNING id INTO v_history_id;

    IF v_history_id IS NULL THEN
      RAISE EXCEPTION 'ATOMIC_STATE_CONFLICT' USING ERRCODE = 'P0001';
    END IF;

    v_new_sentence      := v_score_after;
    v_new_sentence_conf := v_conf_after;
  END IF;

  -- STEP 7 — user_profile update from the locked authoritative state.
  -- Write back the same 6 ability fields the legacy client path maintained.
  -- 0 rows matched (should not happen under the row lock) is a hard error,
  -- never a silent success (SCENARIO I).
  UPDATE user_profile SET
    ability_vocabulary    = v_profile.ability_vocabulary,
    ability_sentence      = v_new_sentence,
    ability_reading       = v_new_reading,
    confidence_vocabulary = v_profile.confidence_vocabulary,
    confidence_sentence   = v_new_sentence_conf,
    confidence_reading    = v_new_reading_conf,
    updated_at            = now()
  WHERE user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_UPDATE_FAILED' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'status', 'APPLIED_NEW',
    'learning_record_id', v_record.id::text,
    'evidence_applied', true
  );
END;
$$;

-- ── Grants ──
-- The RPC is SECURITY DEFINER (runs as the function owner, bypassing RLS) but
-- ownership is still auth.uid() and there is no user_id param, so it can only
-- ever write the calling user's rows. Remove the default PUBLIC execute, then
-- grant to authenticated (and anon, so an unauthenticated call reaches
-- AUTH_REQUIRED instead of a permission error).
REVOKE ALL ON FUNCTION apply_learning_evidence(
  uuid, text, text, text, boolean, jsonb, boolean, real
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION apply_learning_evidence(
  uuid, text, text, text, boolean, jsonb, boolean, real
) TO authenticated, anon;
