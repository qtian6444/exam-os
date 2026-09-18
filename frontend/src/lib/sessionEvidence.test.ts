// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { CardType, SessionStats } from '../types';
import {
  LOCAL_GUEST_SESSION_PROFILE_KEY,
  buildSessionEvidenceProfile,
  getSessionSignalGoal,
  getSessionSignalNextStep,
  readLocalGuestSessionProfile,
  persistLocalGuestSessionProfile,
} from './sessionEvidence';

const STATS: SessionStats = {
  cardsCompleted: 6,
  elapsed: 90_000,
  evidence: [
    {
      cardId: 'choice-1',
      cardType: 'choice' as CardType,
      outcome: 'FIRST_TRY_CORRECT',
      attempts: 1,
      dimensions: ['sentence', 'reading'],
    },
    {
      cardId: 'reorder-1',
      cardType: 'reorder' as CardType,
      outcome: 'RETRY_CORRECT',
      attempts: 2,
      dimensions: ['sentence'],
    },
    {
      cardId: 'choice-2',
      cardType: 'choice' as CardType,
      outcome: 'REVEALED_AFTER_RETRY',
      attempts: 2,
      dimensions: ['sentence', 'reading'],
    },
  ],
};

beforeEach(() => {
  sessionStorage.clear();
});

describe('session evidence profile', () => {
  it('aggregates direct behavior counts without producing an ability score', () => {
    const profile = buildSessionEvidenceProfile('session-1', STATS);

    expect(profile.cardsCompleted).toBe(6);
    expect(profile.firstTryCount).toBe(1);
    expect(profile.retryCount).toBe(1);
    expect(profile.revealedCount).toBe(1);
    expect(profile.dimensions.sentence).toEqual({
      evidenceCount: 3,
      firstTryCount: 1,
      retryCount: 1,
      revealedCount: 1,
    });
    expect(profile.dimensions.reading).toEqual({
      evidenceCount: 2,
      firstTryCount: 1,
      retryCount: 0,
      revealedCount: 1,
    });
    expect(profile.dimensions.vocabulary.evidenceCount).toBe(0);
  });

  it('persists and validates the last local guest session', () => {
    const saved = persistLocalGuestSessionProfile('session-1', STATS);

    expect(saved?.sessionId).toBe('session-1');
    expect(readLocalGuestSessionProfile()).toEqual(saved);

    sessionStorage.setItem(LOCAL_GUEST_SESSION_PROFILE_KEY, '{bad json');
    expect(readLocalGuestSessionProfile()).toBeNull();
  });

  it('derives next-step copy from observed outcomes', () => {
    const profile = buildSessionEvidenceProfile('session-1', STATS);

    expect(getSessionSignalNextStep(profile).headline).toBe('先做一次无提示验证');
    expect(getSessionSignalGoal(profile).title).toBe('已形成 6 道题的行为线索');
  });
});
