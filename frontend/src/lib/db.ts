import { supabase, getAuthUserId } from './supabase';
import type { ExamType, ExamBatch, DailyTime } from '../types';
import {
  type AbilitySnapshot,
  computeEvidence,
  blankSnapshot,
} from './ability';

// ── Idempotency key helper ──

// Deterministic RFC-4122-shaped UUID from a string seed. Used to give
// learning_record / ability_history inserts a stable PK across retries, so a
// re-attempt after a partially-acknowledged write can never manufacture a
// duplicate row — without adding a new unique constraint to any core table.
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function stableUuid(seed: string): string {
  const a = fnv1a(seed + '#a').toString(16).padStart(8, '0');
  const b = fnv1a(seed + '#b').toString(16).padStart(8, '0');
  const c = fnv1a(seed + '#c').toString(16).padStart(8, '0');
  const d = fnv1a(seed + '#d').toString(16).padStart(8, '0');
  return `${a}-${b.slice(0, 4)}-${b.slice(4)}-${c.slice(0, 4)}-${c.slice(4)}${d}`;
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

export async function getAbilitySnapshot(): Promise<AbilitySnapshot> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from('user_profile')
    .select(
      'ability_vocabulary, ability_sentence, ability_reading, ability_listening, ability_writing, confidence_vocabulary, confidence_sentence, confidence_reading, confidence_listening, confidence_writing',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
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

// ── Learning Record ──

export interface RecordCardParams {
  sessionId: string;
  cardId: string;
  cardType: 'choice' | 'reading_breakdown' | 'reorder';
  correct: boolean | null;
  userAnswer?: unknown;
}

export async function insertLearningRecord(params: RecordCardParams): Promise<string | null> {
  const userId = await getAuthUserId();

  // Stable PK so a retry of the same (session, card) reuses the same row rather
  // than inserting a duplicate.
  const id = stableUuid(`${params.sessionId}::${params.cardId}`);

  const { data, error } = await supabase
    .from('learning_record')
    .insert({
      id,
      user_id: userId,
      session_id: params.sessionId,
      card_id: params.cardId,
      card_type: params.cardType,
      correct: params.correct,
      user_answer: params.userAnswer || null,
    })
    .select('id')
    .single();

  if (error) {
    // 23505 = PK already exists from a prior (partially-acknowledged) attempt.
    // Idempotent success, not a new row.
    if (error.code === '23505') return id;
    console.error('[DB] insertLearningRecord failed:', error);
    return null;
  }
  return data.id;
}

// ── Ability History ──

export async function processAbilityEvidence(
  learningRecordId: string,
  cardType: string,
  isCorrect: boolean,
  difficulty: number,
): Promise<boolean> {
  const userId = await getAuthUserId();

  // Load current snapshot
  const snapshot = await getAbilitySnapshot();

  // Compute deltas
  const evidence = computeEvidence(snapshot, cardType, isCorrect, difficulty);
  if (evidence.length === 0) return true;

  // Insert ability_history rows with a stable PK per (record, ability) so a
  // retry never duplicates them.
  const rows = evidence.map((e) => ({
    id: stableUuid(`${learningRecordId}::${e.abilityKey}`),
    user_id: userId,
    learning_record_id: learningRecordId,
    ability_key: e.abilityKey,
    evidence_weight: e.evidenceWeight,
    correct: e.correct,
    score_before: e.scoreBefore,
    score_after: e.scoreAfter,
    confidence_before: e.confidenceBefore,
    confidence_after: e.confidenceAfter,
  }));

  const { error: histError } = await supabase.from('ability_history').insert(rows);
  if (histError && histError.code !== '23505') {
    // 23505 = rows already exist from a prior attempt → idempotent, not an error.
    console.error('[DB] ability_history insert failed:', histError);
    return false;
  }

  // Update user_profile with new scores (absolute values → idempotent).
  const { error: profError } = await supabase
    .from('user_profile')
    .update({
      ability_vocabulary: snapshot.vocabulary,
      ability_sentence: snapshot.sentence,
      ability_reading: snapshot.reading,
      confidence_vocabulary: snapshot.confidence_vocabulary,
      confidence_sentence: snapshot.confidence_sentence,
      confidence_reading: snapshot.confidence_reading,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (profError) {
    console.error('[DB] user_profile ability update failed:', profError);
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
