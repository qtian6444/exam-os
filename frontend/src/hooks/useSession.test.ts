// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useSession } from './useSession';
import type { OnboardingProfile, FirstSessionContext } from '../types';

vi.mock('../lib/db', () => ({
  getAbilitySnapshot: vi.fn(),
  persistUserProfile: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  getAuthUserId: vi.fn(),
}));

vi.mock('../lib/ability', () => ({
  blankSnapshot: vi.fn(() => ({})),
}));

vi.mock('../lib/dashboard', () => ({
  ensureProfileReady: vi.fn(),
}));

vi.mock('../data/mock', () => ({
  resetCardQueue: vi.fn(),
}));

import { getAbilitySnapshot, persistUserProfile } from '../lib/db';
import { getAuthUserId } from '../lib/supabase';
import { blankSnapshot } from '../lib/ability';
import { ensureProfileReady } from '../lib/dashboard';
import { resetCardQueue } from '../data/mock';

const persist = persistUserProfile as unknown as ReturnType<typeof vi.fn>;
const getUid = getAuthUserId as unknown as ReturnType<typeof vi.fn>;
const snapshot = getAbilitySnapshot as unknown as ReturnType<typeof vi.fn>;
const blank = blankSnapshot as unknown as ReturnType<typeof vi.fn>;
const ensure = ensureProfileReady as unknown as ReturnType<typeof vi.fn>;
const resetQueue = resetCardQueue as unknown as ReturnType<typeof vi.fn>;

const PROFILE: OnboardingProfile = {
  examType: 'CET4',
  examBatch: '2026-12',
  dailyTime: '10min',
  purpose: 'cet_exam',
  targetScore: 'pass_425',
  selfBaseline: 'starter',
  primaryObstacle: 'vocabulary_insufficient',
  supportPreference: 'moderate_hints_self_try',
  purposeDetail: null,
};

// The exact self-report payload that must round-trip through sessionStorage.
const CONTEXT: FirstSessionContext = {
  purpose: 'cet_exam',
  targetScore: 'pass_425',
  selfBaseline: 'starter',
  primaryObstacle: 'vocabulary_insufficient',
  supportPreference: 'moderate_hints_self_try',
  purposeDetail: null,
  dailyTime: '10min',
};

const CONTEXT_KEY = 'exam_os.onboarding.context.uid-test';
const DONE_KEY = 'exam_os.onboarding.done.uid-test';

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  getUid.mockResolvedValue('uid-test');
  ensure.mockResolvedValue(true);
  persist.mockResolvedValue('uid-test');
  snapshot.mockResolvedValue({ level: 1 });
  blank.mockReturnValue({});
  resetQueue.mockReturnValue(undefined);
});

afterEach(() => {
  sessionStorage.clear();
});

describe('useSession — onboarding gate (identity-scoped sessionStorage)', () => {
  it('starts at dashboard, then moves to onboarding when no context exists', async () => {
    const { result } = renderHook(() => useSession());

    expect(result.current.stage).toBe('dashboard');
    await waitFor(() => expect(result.current.stage).toBe('onboarding'));
  });

  it('stays on dashboard when this identity has a valid context AND done marker', async () => {
    sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(CONTEXT));
    sessionStorage.setItem(DONE_KEY, '1');
    const { result } = renderHook(() => useSession());

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.stage).toBe('dashboard');
  });

  it('re-onboards when the done marker exists but the context is missing', async () => {
    sessionStorage.setItem(DONE_KEY, '1');
    const { result } = renderHook(() => useSession());

    await waitFor(() => expect(result.current.stage).toBe('onboarding'));
  });

  it('re-onboards when the context is corrupt even with a done marker', async () => {
    sessionStorage.setItem(CONTEXT_KEY, '{not valid json');
    sessionStorage.setItem(DONE_KEY, '1');
    const { result } = renderHook(() => useSession());

    await waitFor(() => expect(result.current.stage).toBe('onboarding'));
  });

  it('does not reuse another identity context (guest vs permanent isolation)', async () => {
    sessionStorage.setItem('exam_os.onboarding.context.uid-A', JSON.stringify(CONTEXT));
    sessionStorage.setItem('exam_os.onboarding.done.uid-A', '1');
    getUid.mockResolvedValue('uid-B');

    const { result } = renderHook(() => useSession());

    await waitFor(() => expect(result.current.stage).toBe('onboarding'));
  });

  it('restores the full context on reload and stays on dashboard', async () => {
    sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(CONTEXT));
    sessionStorage.setItem(DONE_KEY, '1');
    const { result } = renderHook(() => useSession());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.stage).toBe('dashboard');
    expect(result.current.selfReport.current).toEqual(CONTEXT);
  });

  it('restores a non-CET context (correct route) on reload', async () => {
    const nonCet: FirstSessionContext = {
      purpose: 'career',
      targetScore: null,
      selfBaseline: 'functional',
      primaryObstacle: 'writing_expression_hard',
      supportPreference: 'few_hints_challenge',
      purposeDetail: 'meeting_daily_comm',
      dailyTime: '20min',
    };
    sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(nonCet));
    sessionStorage.setItem(DONE_KEY, '1');
    const { result } = renderHook(() => useSession());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.stage).toBe('dashboard');
    expect(result.current.selfReport.current).toEqual(nonCet);
  });
});

describe('useSession — completeOnboarding', () => {
  it('persists only USER_EDITABLE columns, writes context before done, and enters learning', async () => {
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.stage).toBe('onboarding'));

    let ok = false;
    await act(async () => {
      ok = await result.current.completeOnboarding(PROFILE);
    });

    expect(ok).toBe(true);
    // Self-report fields (purpose/targetScore/selfBaseline/…) NEVER reach the DB:
    // the persist payload is exactly the three USER_EDITABLE columns.
    expect(persist).toHaveBeenCalledWith({
      examType: 'CET4',
      examBatch: '2026-12',
      dailyTime: '10min',
    });
    expect(persist).toHaveBeenCalledTimes(1);

    // Full context is stored (uid-scoped) and the done marker follows it.
    expect(JSON.parse(sessionStorage.getItem(CONTEXT_KEY) ?? 'null')).toEqual(CONTEXT);
    expect(sessionStorage.getItem(DONE_KEY)).toBe('1');

    // The existing CET-4 training entry is untouched: the mock queue is reset.
    expect(resetQueue).toHaveBeenCalled();
    expect(result.current.stage).toBe('learning');
  });

  it('returns false and stays on onboarding when persist fails (no context, no marker)', async () => {
    persist.mockResolvedValue(null);
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.stage).toBe('onboarding'));

    let ok = true;
    await act(async () => {
      ok = await result.current.completeOnboarding(PROFILE);
    });

    expect(ok).toBe(false);
    expect(sessionStorage.getItem(CONTEXT_KEY)).toBeNull();
    expect(sessionStorage.getItem(DONE_KEY)).toBeNull();
    expect(result.current.stage).toBe('onboarding');
  });
});
