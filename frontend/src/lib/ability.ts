// ── Ability Score V0 ──
// ChatGPT-delivered formula. MVP calibration, all params marked [C].

/**
 * An ability dimension with score + confidence.
 * Score: 0.0–1.0 (how good the user is at this skill)
 * Confidence: 0.0–1.0 (how sure we are about the score)
 */
export interface AbilitySnapshot {
  vocabulary: number;
  sentence: number;
  reading: number;
  listening: number;
  writing: number;
  confidence_vocabulary: number;
  confidence_sentence: number;
  confidence_reading: number;
  confidence_listening: number;
  confidence_writing: number;
}

export type AbilityKey = 'vocabulary' | 'sentence' | 'reading' | 'listening' | 'writing';

// ── [C] MVP Calibration Values ──
const LEARNING_RATE = 0.3;      // How fast score rises on correct
const PENALTY_RATE = 0.15;      // How fast score drops on wrong (lower than rise)
const CONFIDENCE_GAIN = 0.1;    // How fast confidence accumulates per evidence

/**
 * Card types that produce skill evidence and their skill mappings.
 * ReadingBreakdown / preference ChoiceCards produce NO evidence.
 */
function getSkillMapping(cardType: string): { key: AbilityKey; weight: number }[] {
  switch (cardType) {
    case 'choice':
      // Real comprehension question → sentence + reading
      return [
        { key: 'sentence', weight: 0.5 },
        { key: 'reading', weight: 0.5 },
      ];
    case 'reorder':
      // Sentence ordering → sentence only
      return [{ key: 'sentence', weight: 1.0 }];
    default:
      return [];
  }
}

export function getAbilityKey(snapshot: AbilitySnapshot, key: AbilityKey): number {
  switch (key) {
    case 'vocabulary': return snapshot.vocabulary;
    case 'sentence':   return snapshot.sentence;
    case 'reading':    return snapshot.reading;
    case 'listening':  return snapshot.listening;
    case 'writing':    return snapshot.writing;
  }
}

export function getConfidenceKey(snapshot: AbilitySnapshot, key: AbilityKey): number {
  switch (key) {
    case 'vocabulary': return snapshot.confidence_vocabulary;
    case 'sentence':   return snapshot.confidence_sentence;
    case 'reading':    return snapshot.confidence_reading;
    case 'listening':  return snapshot.confidence_listening;
    case 'writing':    return snapshot.confidence_writing;
  }
}

function setAbilityKey(snapshot: AbilitySnapshot, key: AbilityKey, value: number): void {
  switch (key) {
    case 'vocabulary': snapshot.vocabulary = value; break;
    case 'sentence':   snapshot.sentence = value;   break;
    case 'reading':    snapshot.reading = value;    break;
    case 'listening':  snapshot.listening = value;  break;
    case 'writing':    snapshot.writing = value;    break;
  }
}

function setConfidenceKey(snapshot: AbilitySnapshot, key: AbilityKey, value: number): void {
  switch (key) {
    case 'vocabulary': snapshot.confidence_vocabulary = value; break;
    case 'sentence':   snapshot.confidence_sentence = value;   break;
    case 'reading':    snapshot.confidence_reading = value;    break;
    case 'listening':  snapshot.confidence_listening = value;  break;
    case 'writing':    snapshot.confidence_writing = value;    break;
  }
}

/**
 * Calculate ability deltas for a single piece of evidence.
 * Returns the list of ability_history rows to insert.
 */
export interface EvidenceResult {
  abilityKey: AbilityKey;
  evidenceWeight: number;
  correct: boolean;
  scoreBefore: number;
  scoreAfter: number;
  confidenceBefore: number;
  confidenceAfter: number;
}

export function computeEvidence(
  currentSnapshot: AbilitySnapshot,
  cardType: string,
  isCorrect: boolean,
  difficulty: number, // 0.0–1.0
): EvidenceResult[] {
  const skills = getSkillMapping(cardType);
  if (skills.length === 0) return [];

  const results: EvidenceResult[] = [];
  const clamped = (v: number) => Math.max(0, Math.min(1, v));

  for (const { key, weight } of skills) {
    const scoreBefore = getAbilityKey(currentSnapshot, key);
    const confidenceBefore = getConfidenceKey(currentSnapshot, key);

    // Evidence weight = difficulty × skill_weight [C]
    const evidenceWeight = clamped(difficulty * weight);

    // Score delta [C]
    let scoreAfter: number;
    if (isCorrect) {
      scoreAfter = scoreBefore + evidenceWeight * (1 - scoreBefore) * LEARNING_RATE;
    } else {
      scoreAfter = scoreBefore - evidenceWeight * scoreBefore * PENALTY_RATE;
    }
    scoreAfter = clamped(scoreAfter);

    // Confidence: always increases with more evidence [C]
    const confidenceAfter = clamped(confidenceBefore + evidenceWeight * CONFIDENCE_GAIN);

    results.push({
      abilityKey: key,
      evidenceWeight,
      correct: isCorrect,
      scoreBefore,
      scoreAfter,
      confidenceBefore,
      confidenceAfter,
    });

    // Mutate snapshot for subsequent skill mappings on the same card
    setAbilityKey(currentSnapshot, key, scoreAfter);
    setConfidenceKey(currentSnapshot, key, confidenceAfter);
  }

  return results;
}

/** Create a blank ability snapshot (all zeros). */
export function blankSnapshot(): AbilitySnapshot {
  return {
    vocabulary: 0, sentence: 0, reading: 0, listening: 0, writing: 0,
    confidence_vocabulary: 0, confidence_sentence: 0, confidence_reading: 0,
    confidence_listening: 0, confidence_writing: 0,
  };
}
