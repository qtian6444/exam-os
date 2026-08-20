import { supabase, getAuthUserId } from './supabase';
import type { ExamType, ExamBatch, DailyTime } from '../types';
import {
  type AbilitySnapshot,
  blankSnapshot,
} from './ability';

// ── Idempotency key helper ──

// Deterministic RFC-4122-shaped UUID from a string seed, derived from SHA-256
// (NOT a 32-bit FNV). It gives learning_record / ability_history inserts a
// stable PK across retries, so a re-attempt after a partially-acknowledged write
// can never manufacture a duplicate row. SHA-256 is used because a 32-bit
// deterministic space is collidable; a 128-bit cryptographically-strong digest
// makes two *different* logical operations mapping to the same key vanishingly
// unlikely (≈2^-128).
export async function stableUuid(seed: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // RFC-4122 version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC-4122 variant 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Pure decision: does an already-persisted learning_record row represent the
 * SAME logical operation as the one we are trying to write?
 *
 * A 23505 (PK exists) is only idempotent success if the conflicting row is the
 * same (user, session, card). If the PK collided with a *different* operation,
 * this returns false and the caller must hard-fail rather than swallow it.
 */
export function isSameLearningOperation(
  existing: { user_id: string; session_id: string; card_id: string } | null,
  expected: { userId: string; sessionId: string; cardId: string },
): boolean {
  return (
    !!existing &&
    existing.user_id === expected.userId &&
    existing.session_id === expected.sessionId &&
    existing.card_id === expected.cardId
  );
}

// ── User Profile ──

export interface ProfileSettings {
  examType: ExamType;
  examBatch: ExamBatch;
  dailyTime: DailyTime;
}

// The USER_EDITABLE column set, shared by CREATE and UPDATE so the two paths
// can never drift. user_id (identity) is deliberately NOT here: it is INSERT-only
// and only ever set once to auth.uid(). ability_* / confidence_* are never here —
// they are SYSTEM_AUTHORITATIVE and only the SECURITY DEFINER RPC may write them.
function editableProfilePayload(profile: ProfileSettings) {
  return {
    exam_type: profile.examType,
    exam_batch: profile.examBatch,
    daily_time: profile.dailyTime,
    updated_at: new Date().toISOString(),
  };
}

type CreateProfileResult =
  | { ok: true; userId: string }
  | { ok: false; duplicate: boolean };

// A 23505 (unique violation) is only "profile already exists" when it fired on
// the user_id unique constraint (user_profile_user_id_key). user_profile also has
// a PRIMARY KEY on id, so 23505 is NOT a single-constraint signal — an unrelated
// unique violation (e.g. a future unique column, or a primary-key collision) is a
// REAL error and must fail, never fall through to UPDATE. PostgREST echoes the
// constraint name in error.message, so we match on that rather than the bare code.
function isDuplicateUserProfile(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  return error?.code === '23505' && !!error?.message?.includes('user_profile_user_id_key');
}

// CREATE path: INSERT identity (user_id = auth.uid()) + USER_EDITABLE columns.
// A pre-existing profile surfaces as PostgREST error code 23505 on the user_id
// unique constraint — the deterministic "already exists" signal for the
// coordinator. Any OTHER error (including an unrelated 23505) is NOT a duplicate
// signal and must fall through to the hard-fail branch below.
async function tryCreateProfile(profile: ProfileSettings): Promise<CreateProfileResult> {
  const userId = await getAuthUserId();
  const { error } = await supabase.from('user_profile').insert({
    user_id: userId,
    ...editableProfilePayload(profile),
  });
  if (!error) return { ok: true, userId };
  return { ok: false, duplicate: isDuplicateUserProfile(error) };
}

// UPDATE path: USER_EDITABLE columns only — the payload never contains user_id or
// any authoritative (ability_* / confidence_*) column, so the request itself
// conforms to the column-level privilege model (no UPDATE(user_id) needed, owner
// immutability preserved).
export async function updateUserProfile(profile: ProfileSettings): Promise<string | null> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from('user_profile')
    .update(editableProfilePayload(profile))
    .eq('user_id', userId)
    .select('user_id');

  if (error) {
    console.error('[DB] updateUserProfile failed:', error);
    return null;
  }
  if (!isProfileUpdateApplied(data)) {
    // 0 rows: no owned profile row (missing, or RLS blocked the match). A real
    // failure, never a silent success.
    console.error('[DB] updateUserProfile: no matching profile row');
    return null;
  }
  return userId;
}

// Persist onboarding settings. First-time onboarding CREATES the profile; a
// returning user (same auth.uid()) UPDATES the existing row. The old merge-upsert
// (INSERT ... ON CONFLICT DO UPDATE) is gone: PostgREST would fold user_id into
// the UPDATE set and require UPDATE(user_id), violating owner immutability.
export async function persistUserProfile(profile: ProfileSettings): Promise<string | null> {
  const created = await tryCreateProfile(profile);
  if (created.ok) return created.userId;
  if (created.duplicate) return updateUserProfile(profile);
  // permission / network / other → surface, never swallow.
  console.error('[DB] persistUserProfile insert failed');
  return null;
}

export interface ProfileAbilityRow {
  ability_vocabulary: number | null;
  ability_sentence: number | null;
  ability_reading: number | null;
  ability_listening: number | null;
  ability_writing: number | null;
  confidence_vocabulary: number | null;
  confidence_sentence: number | null;
  confidence_reading: number | null;
  confidence_listening: number | null;
  confidence_writing: number | null;
}

/**
 * Pure decision: turn a profile read into a snapshot.
 *
 * A READ error (network / 5xx / RLS denial) is NOT "no ability data yet" — it
 * throws so the caller surfaces a retryable failure instead of silently treating
 * a broken read as a blank (all-zero) snapshot. Only `data === null` with no
 * error (genuinely no profile row) maps to a blank starting snapshot.
 */
export function resolveAbilitySnapshot(
  data: ProfileAbilityRow | null,
  error: { message: string } | null,
): AbilitySnapshot {
  if (error) {
    throw new Error(`Failed to read ability snapshot: ${error.message}`);
  }
  if (!data) {
    return blankSnapshot();
  }
  return {
    vocabulary: data.ability_vocabulary ?? 0,
    sentence: data.ability_sentence ?? 0,
    reading: data.ability_reading ?? 0,
    listening: data.ability_listening ?? 0,
    writing: data.ability_writing ?? 0,
    confidence_vocabulary: data.confidence_vocabulary ?? 0,
    confidence_sentence: data.confidence_sentence ?? 0,
    confidence_reading: data.confidence_reading ?? 0,
    confidence_listening: data.confidence_listening ?? 0,
    confidence_writing: data.confidence_writing ?? 0,
  };
}

export async function getAbilitySnapshot(): Promise<AbilitySnapshot> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from('user_profile')
    .select(
      'ability_vocabulary, ability_sentence, ability_reading, ability_listening, ability_writing, confidence_vocabulary, confidence_sentence, confidence_reading, confidence_listening, confidence_writing',
    )
    .eq('user_id', userId)
    .maybeSingle();

  return resolveAbilitySnapshot(data, error);
}

/**
 * Pure decision: did a profile UPDATE actually affect a row? A `.select()`
 * returning zero rows (no matching user_profile) is a failure, not a silent
 * "success".
 */
export function isProfileUpdateApplied(rows: { user_id: string }[] | null): boolean {
  return !!rows && rows.length > 0;
}

// ── Learning Record + Ability Evidence (atomic RPC) ──
//
// P0-SECURITY-R4: the whole write chain (learning_record + ability_history +
// user_profile ability/state update) is delegated to the PostgreSQL function
// `apply_learning_evidence`, which runs it inside ONE transaction. This removes
// the old client-side multi-step write (insertLearningRecord →
// processAbilityEvidence) that could leave learning_record committed while the
// ability/profile update was lost, and could double-apply evidence on a retry
// after a lost response.
//
// The RPC is idempotent on the deterministic operation id (the same
// SHA-256-based UUID as before) and returns a machine-readable status. The
// client only validates that status — it never re-inserts, re-updates, or
// re-applies the individual steps itself.

export type ApplyEvidenceStatus = 'APPLIED_NEW' | 'IDEMPOTENT_ALREADY_APPLIED';

// Bounded save deadline. A single RPC round-trip should settle in well under
// a second on a healthy connection; 15s is a generous ceiling for weak / VPN /
// high-latency networks while still guaranteeing the save UI can never be stuck
// "saving" forever on a never-settling request (DNS stall / half-open socket).
export const SAVE_TIMEOUT_MS = 15_000;

export async function applyLearningEvidence(params: {
  sessionId: string;
  cardId: string;
  cardType: 'choice' | 'reading_breakdown' | 'reorder';
  correct: boolean | null;
  userAnswer?: unknown;
}): Promise<boolean> {
  // Stable operation id so a retry of the same (session, card) hits the same
  // learning_record PK and the RPC returns idempotent success instead of a
  // duplicate. The RPC derives the owner from auth.uid() — there is no user_id
  // parameter, so no client-supplied identity can be forged.
  const operationId = await stableUuid(`${params.sessionId}::${params.cardId}`);

  // Real cancellation, not a Promise.race: .abortSignal() wires the controller's
  // signal into the underlying fetch so the RPC actually stops on the deadline
  // instead of leaving a dangling request running in the background forever.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS);

  try {
    const { data, error } = await supabase
      .rpc('apply_learning_evidence', {
        p_operation_id: operationId,
        p_session_id: params.sessionId,
        p_card_id: params.cardId,
        p_card_type: params.cardType,
        p_correct: params.correct,
        p_user_answer: params.userAnswer ?? null,
        p_skip_evidence: shouldSkipEvidence(params.cardType, params.cardId),
        p_difficulty: getCardDifficulty(params.cardType),
      })
      .abortSignal(controller.signal);

    if (error) {
      // error covers a real RPC error code (AUTH_REQUIRED / INVALID_PAYLOAD /
      // PROFILE_NOT_FOUND / LEARNING_OPERATION_ID_COLLISION /
      // ATOMIC_STATE_CONFLICT / PROFILE_UPDATE_FAILED) AND a locally-aborted
      // request (AbortError from the deadline). Both roll the transaction back /
      // write nothing, so surface as failure — never a silent "success".
      console.error('[DB] applyLearningEvidence RPC failed:', error);
      return false;
    }

    const status = (data as { status?: string } | null)?.status;
    if (status !== 'APPLIED_NEW' && status !== 'IDEMPOTENT_ALREADY_APPLIED') {
      console.error('[DB] applyLearningEvidence unexpected status:', data);
      return false;
    }

    return true;
  } catch (err) {
    // Defensive: some transport layers reject (rather than resolve-with-error)
    // on abort. Treat any throw as a failure, never a silent "success".
    console.error('[DB] applyLearningEvidence RPC threw:', err);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Utility ──

/** Cards that should NOT produce ability evidence. */
export function shouldSkipEvidence(cardType: string, cardId: string): boolean {
  // ReadingBreakdown never produces evidence
  if (cardType === 'reading_breakdown') return true;
  // Preference cards (no correct answer) never produce evidence
  if (cardId.startsWith('choice-welcome') || cardId.startsWith('choice-goal')) return true;
  return false;
}

/** Get difficulty for a card type. Used as evidence weight multiplier. */
export function getCardDifficulty(cardType: string): number {
  switch (cardType) {
    case 'choice':   return 0.4;  // Multiple choice: moderate
    case 'reorder':  return 0.6;  // Sentence reorder: harder
    default:         return 0.3;
  }
}
