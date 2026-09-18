import type { AbilityKey, AbilitySnapshot } from './ability';
import type { SessionEvidenceProfile } from './sessionEvidence';

export type RadarKey = AbilityKey | 'stability';

export interface DisplayAbilityDimension {
  key: RadarKey;
  label: string;
  value: number | null;
  confidence: number;
  evidenceCount: number;
  observed: boolean;
}

export interface Cet4DisplayRange {
  low: number;
  high: number;
  label: string;
}

export interface DisplayAbilitySummary {
  dimensions: DisplayAbilityDimension[];
  index: number | null;
  confidence: number;
  cet4Range: Cet4DisplayRange | null;
  basis: 'SESSION_OBSERVATION' | 'LONG_TERM_SNAPSHOT';
}

export const RADAR_DIMENSIONS: { key: RadarKey; label: string }[] = [
  { key: 'vocabulary', label: '词汇' },
  { key: 'sentence', label: '长难句' },
  { key: 'reading', label: '阅读' },
  { key: 'stability', label: '作答稳定' },
  { key: 'writing', label: '写作' },
  { key: 'listening', label: '听力' },
];

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(clamp(value));
}

function signalValue(evidenceCount: number, firstTryCount: number, retryCount: number, revealedCount: number): number | null {
  if (evidenceCount <= 0) return null;

  // Display-only heuristic: an independent answer carries more signal than a
  // retry or an answer revealed after explanation. This is not an exam score.
  const weightedOutcome = firstTryCount + retryCount * 0.72 + revealedCount * 0.35;
  const outcomeQuality = weightedOutcome / evidenceCount;
  const coverage = Math.min(1, evidenceCount / 4);
  // Keep a short six-card session from jumping straight to a near-perfect
  // value: outcome quality drives the shape, while coverage supplies only a
  // limited lift until more independent tasks have been observed.
  return round(outcomeQuality * 60 + coverage * 20);
}

function signalConfidence(evidenceCount: number): number {
  return round(Math.min(1, evidenceCount / 8) * 100);
}

function sessionRange(index: number, confidence: number): Cet4DisplayRange {
  // Internal presentation bands only. They are deliberately labelled as
  // indicative because six short tasks cannot predict a CET-4 score.
  const bands: Cet4DisplayRange[] = [
    { low: 300, high: 374, label: '约 300–374' },
    { low: 375, high: 424, label: '约 375–424' },
    { low: 425, high: 489, label: '约 425–489' },
    { low: 490, high: 579, label: '约 490–579' },
    { low: 580, high: 710, label: '约 580–710' },
  ];
  const bandIndex = Math.min(bands.length - 1, Math.floor(index / 20));
  let lowIndex = bandIndex;
  let highIndex = bandIndex;
  if (confidence < 50) {
    lowIndex = Math.max(0, bandIndex - 1);
    highIndex = Math.min(bands.length - 1, bandIndex + 1);
  }
  const low = bands[lowIndex].low;
  const high = bands[highIndex].high;
  return { low, high, label: `约 ${low}–${high}` };
}

function makeSessionDimension(
  key: RadarKey,
  label: string,
  profile: SessionEvidenceProfile,
): DisplayAbilityDimension {
  if (key === 'stability') {
    const evidenceCount = profile.firstTryCount + profile.retryCount + profile.revealedCount;
    return {
      key,
      label,
      value: signalValue(evidenceCount, profile.firstTryCount, profile.retryCount, profile.revealedCount),
      confidence: signalConfidence(evidenceCount),
      evidenceCount,
      observed: evidenceCount > 0,
    };
  }

  const signal = profile.dimensions[key];
  return {
    key,
    label,
    value: signalValue(signal.evidenceCount, signal.firstTryCount, signal.retryCount, signal.revealedCount),
    confidence: signalConfidence(signal.evidenceCount),
    evidenceCount: signal.evidenceCount,
    observed: signal.evidenceCount > 0,
  };
}

export function buildSessionAbilitySummary(profile: SessionEvidenceProfile): DisplayAbilitySummary {
  const dimensions = RADAR_DIMENSIONS.map(({ key, label }) => makeSessionDimension(key, label, profile));
  const observed = dimensions.filter((dimension) => dimension.observed && dimension.value !== null);
  const totalEvidence = observed.reduce((sum, dimension) => sum + dimension.evidenceCount, 0);
  const index = observed.length > 0
    ? round(observed.reduce((sum, dimension) => sum + (dimension.value ?? 0) * dimension.evidenceCount, 0) / totalEvidence)
    : null;
  const confidence = observed.length > 0
    ? round(observed.reduce((sum, dimension) => sum + dimension.confidence * dimension.evidenceCount, 0) / totalEvidence)
    : 0;

  return {
    dimensions,
    index,
    confidence,
    cet4Range: index === null ? null : sessionRange(index, confidence),
    basis: 'SESSION_OBSERVATION',
  };
}

export function buildSnapshotAbilitySummary(snapshot: AbilitySnapshot): DisplayAbilitySummary {
  const dimensions = RADAR_DIMENSIONS.map(({ key, label }) => {
    if (key === 'stability') {
      const values = (['vocabulary', 'sentence', 'reading', 'listening', 'writing'] as AbilityKey[])
        .map((dimension) => snapshot[dimension]);
      const confidenceValues = (['vocabulary', 'sentence', 'reading', 'listening', 'writing'] as AbilityKey[])
        .map((dimension) => snapshot[`confidence_${dimension}` as keyof AbilitySnapshot] as number);
      const observed = confidenceValues.some((value) => value > 0);
      return {
        key,
        label,
        value: observed ? round(values.reduce((sum, value) => sum + value, 0) / values.length * 100) : null,
        confidence: observed ? round(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length * 100) : 0,
        evidenceCount: 0,
        observed,
      };
    }
    const value = snapshot[key];
    const confidence = snapshot[`confidence_${key}` as keyof AbilitySnapshot] as number;
    return {
      key,
      label,
      value: confidence > 0 || value > 0 ? round(value * 100) : null,
      confidence: round(confidence * 100),
      evidenceCount: 0,
      observed: confidence > 0 || value > 0,
    };
  });
  const observed = dimensions.filter((dimension) => dimension.observed && dimension.value !== null);
  const index = observed.length > 0
    ? round(observed.reduce((sum, dimension) => sum + (dimension.value ?? 0), 0) / observed.length)
    : null;
  const confidence = observed.length > 0
    ? round(observed.reduce((sum, dimension) => sum + dimension.confidence, 0) / observed.length)
    : 0;
  return {
    dimensions,
    index,
    confidence,
    cet4Range: index === null ? null : sessionRange(index, confidence),
    basis: 'LONG_TERM_SNAPSHOT',
  };
}
