import type { EvidenceDimension, SessionStats } from '../types';

export const LOCAL_GUEST_SESSION_PROFILE_KEY = 'exam_os.local_guest_session_profile.v1';

export interface DimensionEvidenceSignal {
  evidenceCount: number;
  firstTryCount: number;
  retryCount: number;
  revealedCount: number;
}

export interface SessionEvidenceProfile {
  schemaVersion: 1;
  sessionId: string;
  recordedAt: string;
  cardsCompleted: number;
  firstTryCount: number;
  retryCount: number;
  revealedCount: number;
  dimensions: Record<EvidenceDimension, DimensionEvidenceSignal>;
}

const DIMENSIONS: EvidenceDimension[] = [
  'vocabulary',
  'sentence',
  'reading',
  'listening',
  'writing',
];

function emptySignal(): DimensionEvidenceSignal {
  return { evidenceCount: 0, firstTryCount: 0, retryCount: 0, revealedCount: 0 };
}

function emptyDimensions(): Record<EvidenceDimension, DimensionEvidenceSignal> {
  return Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, emptySignal()])) as Record<
    EvidenceDimension,
    DimensionEvidenceSignal
  >;
}

/**
 * Turn one completed session into observable counts only. No score, level, or
 * mastery claim is produced here; every value is a direct count of recorded
 * evidence items.
 */
export function buildSessionEvidenceProfile(sessionId: string, stats: SessionStats): SessionEvidenceProfile {
  const dimensions = emptyDimensions();
  let firstTryCount = 0;
  let retryCount = 0;
  let revealedCount = 0;

  for (const item of stats.evidence) {
    if (item.outcome === 'FIRST_TRY_CORRECT') firstTryCount += 1;
    if (item.outcome === 'RETRY_CORRECT') retryCount += 1;
    if (item.outcome === 'REVEALED_AFTER_RETRY') revealedCount += 1;

    // Defensive de-duplication keeps malformed dimensions from inflating a
    // signal while preserving the original evidence item unchanged.
    for (const dimension of new Set(item.dimensions)) {
      const signal = dimensions[dimension];
      if (!signal) continue;
      signal.evidenceCount += 1;
      if (item.outcome === 'FIRST_TRY_CORRECT') signal.firstTryCount += 1;
      if (item.outcome === 'RETRY_CORRECT') signal.retryCount += 1;
      if (item.outcome === 'REVEALED_AFTER_RETRY') signal.revealedCount += 1;
    }
  }

  return {
    schemaVersion: 1,
    sessionId,
    recordedAt: new Date().toISOString(),
    cardsCompleted: stats.cardsCompleted,
    firstTryCount,
    retryCount,
    revealedCount,
    dimensions,
  };
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function readSignal(value: unknown): value is DimensionEvidenceSignal {
  if (!value || typeof value !== 'object') return false;
  const signal = value as Record<string, unknown>;
  return (
    isFiniteNonNegative(signal.evidenceCount) &&
    isFiniteNonNegative(signal.firstTryCount) &&
    isFiniteNonNegative(signal.retryCount) &&
    isFiniteNonNegative(signal.revealedCount) &&
    signal.firstTryCount + signal.retryCount + signal.revealedCount <= signal.evidenceCount
  );
}

function isSessionEvidenceProfile(value: unknown): value is SessionEvidenceProfile {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Record<string, unknown>;
  if (
    profile.schemaVersion !== 1 ||
    typeof profile.sessionId !== 'string' ||
    typeof profile.recordedAt !== 'string' ||
    !isFiniteNonNegative(profile.cardsCompleted) ||
    !isFiniteNonNegative(profile.firstTryCount) ||
    !isFiniteNonNegative(profile.retryCount) ||
    !isFiniteNonNegative(profile.revealedCount) ||
    !profile.dimensions ||
    typeof profile.dimensions !== 'object'
  ) return false;

  const dimensions = profile.dimensions as Record<string, unknown>;
  return DIMENSIONS.every((dimension) => readSignal(dimensions[dimension]));
}

export function readLocalGuestSessionProfile(): SessionEvidenceProfile | null {
  try {
    const raw = sessionStorage.getItem(LOCAL_GUEST_SESSION_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isSessionEvidenceProfile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function persistLocalGuestSessionProfile(
  sessionId: string,
  stats: SessionStats,
): SessionEvidenceProfile | null {
  const profile = buildSessionEvidenceProfile(sessionId, stats);
  try {
    sessionStorage.setItem(LOCAL_GUEST_SESSION_PROFILE_KEY, JSON.stringify(profile));
    return profile;
  } catch {
    // The result page can still render from in-memory stats if storage is denied.
    return null;
  }
}

export function getSessionSignalNextStep(profile: SessionEvidenceProfile): {
  headline: string;
  action: string;
} {
  if (profile.revealedCount > 0) {
    return {
      headline: '先做一次无提示验证',
      action: `本次有 ${profile.revealedCount} 题查看了解析，下次优先回测同类真题。`,
    };
  }
  if (profile.retryCount > 0) {
    return {
      headline: '把“调整后会做”变成独立完成',
      action: `本次有 ${profile.retryCount} 题在提示后完成，下次先做一题不带提示的同类任务。`,
    };
  }
  return {
    headline: '进入下一组真实语境任务',
    action: '本次首次作答证据完整，下一步换一个语境继续验证。',
  };
}

export function getSessionSignalGoal(profile: SessionEvidenceProfile): {
  title: string;
  action: string;
} {
  const { headline, action } = getSessionSignalNextStep(profile);
  return {
    title: `已形成 ${profile.cardsCompleted} 道题的行为线索`,
    action: `${headline}：${action}`,
  };
}
