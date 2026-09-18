import { describe, expect, it } from 'vitest';
import { buildSessionAbilitySummary } from './sessionAbility';
import type { SessionEvidenceProfile } from './sessionEvidence';

const profile: SessionEvidenceProfile = {
  schemaVersion: 1,
  sessionId: 's-1',
  recordedAt: '2026-09-18T00:00:00.000Z',
  cardsCompleted: 6,
  firstTryCount: 4,
  retryCount: 1,
  revealedCount: 1,
  dimensions: {
    vocabulary: { evidenceCount: 0, firstTryCount: 0, retryCount: 0, revealedCount: 0 },
    sentence: { evidenceCount: 6, firstTryCount: 4, retryCount: 1, revealedCount: 1 },
    reading: { evidenceCount: 4, firstTryCount: 2, retryCount: 1, revealedCount: 1 },
    listening: { evidenceCount: 0, firstTryCount: 0, retryCount: 0, revealedCount: 0 },
    writing: { evidenceCount: 0, firstTryCount: 0, retryCount: 0, revealedCount: 0 },
  },
};

describe('buildSessionAbilitySummary', () => {
  it('renders observed dimensions and keeps unobserved skills unset', () => {
    const summary = buildSessionAbilitySummary(profile);
    const sentence = summary.dimensions.find((dimension) => dimension.key === 'sentence');
    const vocabulary = summary.dimensions.find((dimension) => dimension.key === 'vocabulary');

    expect(sentence?.observed).toBe(true);
    expect(sentence?.value).toBeGreaterThan(0);
    expect(vocabulary?.observed).toBe(false);
    expect(vocabulary?.value).toBeNull();
    expect(summary.index).toBeGreaterThan(0);
    expect(summary.cet4Range?.label).toMatch(/约/);
  });

  it('does not create a score range without evidence', () => {
    const empty = buildSessionAbilitySummary({
      ...profile,
      cardsCompleted: 0,
      firstTryCount: 0,
      retryCount: 0,
      revealedCount: 0,
      dimensions: Object.fromEntries(
        Object.keys(profile.dimensions).map((key) => [key, { evidenceCount: 0, firstTryCount: 0, retryCount: 0, revealedCount: 0 }]),
      ) as SessionEvidenceProfile['dimensions'],
    });

    expect(empty.index).toBeNull();
    expect(empty.cet4Range).toBeNull();
  });
});
