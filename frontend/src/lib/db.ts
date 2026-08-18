import { supabase, getAuthUserId } from './supabase';
import type { ExamType, ExamBatch, DailyTime } from '../types';
import {
  type AbilitySnapshot,
  type EvidenceResult,
  computeEvidence,
  blankSnapshot,
} from './ability';

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

  const { data, error } = await supabase
    .from('learning_record')
    .insert({
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
): Promise<EvidenceResult[]> {
  const userId = await getAuthUserId();

  // Load current snapshot
  const snapshot = await getAbilitySnapshot();

  // Compute deltas
  const evidence = computeEvidence(snapshot, cardType, isCorrect, difficulty);
  if (evidence.length === 0) return [];

  // Insert ability_history rows
  const rows = evidence.map((e) => ({
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
  if (histError) {
    console.error('[DB] ability_history insert failed:', histError);
    return evidence; // Still return evidence even if DB write fails
  }

  // Update user_profile with new scores
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
  }

  return evidence;
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
