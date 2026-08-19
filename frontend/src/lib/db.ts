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

export async function upsertUserProfile(profile: {
  examType: ExamType;
  examBatch: ExamBatch;
  dailyTime: DailyTime;
}): Promise<string | null> {
  const userId = await getAuthUserId();

  const { error } = await supabase.from('user_profile').upsert(
    {
      user_id: userId,
      exam_type: profile.examType,
      exam_batch: profile.examBatch,
      daily_time: profile.dailyTime,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    console.error('[DB] upsertUserProfile failed:', error);
    return null;
  }
  return userId;
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

  const { data, error } = await supabase.rpc('apply_learning_evidence', {
    p_operation_id: operationId,
    p_session_id: params.sessionId,
    p_card_id: params.cardId,
    p_card_type: params.cardType,
    p_correct: params.correct,
    p_user_answer: params.userAnswer ?? null,
    p_skip_evidence: shouldSkipEvidence(params.cardType, params.cardId),
    p_difficulty: getCardDifficulty(params.cardType),
  });

  if (error) {
    // The RPC raised one of the stable error codes (AUTH_REQUIRED,
    // INVALID_PAYLOAD, PROFILE_NOT_FOUND, LEARNING_OPERATION_ID_COLLISION,
    // ATOMIC_STATE_CONFLICT, PROFILE_UPDATE_FAILED). The transaction rolled
    // back, so nothing was partially written. Surface as failure — never a
    // silent "success".
    console.error('[DB] applyLearningEvidence RPC failed:', error);
    return false;
  }

  const status = (data as { status?: string } | null)?.status;
  if (status !== 'APPLIED_NEW' && status !== 'IDEMPOTENT_ALREADY_APPLIED') {
    console.error('[DB] applyLearningEvidence unexpected status:', data);
    return false;
  }

  return true;
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
