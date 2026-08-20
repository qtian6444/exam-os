import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// dashboard.ts reads via the Supabase client and writes the bootstrap profile
// through db.persistUserProfile. Mock both so the pure helpers + the query/return
// mapping are testable in Node without a real Supabase URL / anon key.
vi.mock('./supabase', () => ({
  supabase: { from: vi.fn() },
  getAuthUserId: vi.fn(),
}));
vi.mock('./db', () => ({
  persistUserProfile: vi.fn(),
}));

import { supabase, getAuthUserId } from './supabase';
import { persistUserProfile } from './db';
import { computeStreak, getLearningStats, ensureProfileReady } from './dashboard';

const fromMock = supabase.from as unknown as Mock;
const getAuthUserIdMock = getAuthUserId as unknown as Mock;
const persistUserProfileMock = persistUserProfile as unknown as Mock;

// Query-builder chain: learning_record → select → gte → order (leaf).
const orderMock = vi.fn();
const gteMock = vi.fn(() => ({ order: orderMock }));
const lrSelectMock = vi.fn(() => ({ gte: gteMock }));

// user_profile → select → eq → maybeSingle (leaf).
const maybeSingleMock = vi.fn();
const upEqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const upSelectMock = vi.fn(() => ({ eq: upEqMock }));

beforeEach(() => {
  vi.clearAllMocks();
  fromMock.mockImplementation((table: string) =>
    table === 'user_profile' ? { select: upSelectMock } : { select: lrSelectMock },
  );
});

describe('computeStreak (consecutive local days)', () => {
  it('counts consecutive days ending today', () => {
    expect(computeStreak(['2026-08-20', '2026-08-19', '2026-08-18'], '2026-08-20')).toBe(3);
  });

  it('stays alive when today is missing but yesterday is present', () => {
    expect(computeStreak(['2026-08-19', '2026-08-18'], '2026-08-20')).toBe(2);
  });

  it('returns 0 when neither today nor yesterday is present', () => {
    expect(computeStreak(['2026-08-17', '2026-08-16'], '2026-08-20')).toBe(0);
  });

  it('returns 0 for an empty list', () => {
    expect(computeStreak([], '2026-08-20')).toBe(0);
  });

  it('deduplicates multiple records on the same day', () => {
    expect(computeStreak(['2026-08-20', '2026-08-20', '2026-08-19'], '2026-08-20')).toBe(2);
  });

  it('crosses a month boundary', () => {
    expect(computeStreak(['2026-08-01', '2026-07-31', '2026-07-30'], '2026-08-01')).toBe(3);
  });
});

describe('getLearningStats (learning_record read → today + streak)', () => {
  it('computes todayCount + streak from created_at rows', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86_400_000);
    orderMock.mockResolvedValue({
      data: [{ created_at: now.toISOString() }, { created_at: yesterday.toISOString() }],
      error: null,
    });

    const stats = await getLearningStats();

    expect(fromMock).toHaveBeenCalledWith('learning_record');
    expect(stats.todayCount).toBe(1);
    expect(stats.streak).toBe(2);
  });

  it('returns nulls (unavailable) on a read error — never throws', async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const stats = await getLearningStats();

    expect(stats.todayCount).toBeNull();
    expect(stats.streak).toBeNull();
  });
});

describe('ensureProfileReady (bootstrap write guard)', () => {
  it('returns true without writing when a profile row exists', async () => {
    getAuthUserIdMock.mockResolvedValue('uid-1');
    maybeSingleMock.mockResolvedValue({ data: { user_id: 'uid-1' }, error: null });

    expect(await ensureProfileReady()).toBe(true);
    expect(persistUserProfileMock).not.toHaveBeenCalled();
  });

  it('creates a default profile when the row is absent', async () => {
    getAuthUserIdMock.mockResolvedValue('uid-1');
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    persistUserProfileMock.mockResolvedValue('uid-1');

    expect(await ensureProfileReady()).toBe(true);
    expect(persistUserProfileMock).toHaveBeenCalledTimes(1);
  });

  it('returns false when the create write fails', async () => {
    getAuthUserIdMock.mockResolvedValue('uid-1');
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    persistUserProfileMock.mockResolvedValue(null);

    expect(await ensureProfileReady()).toBe(false);
  });

  it('returns false on a read error and does not write', async () => {
    getAuthUserIdMock.mockResolvedValue('uid-1');
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: 'boom' } });

    expect(await ensureProfileReady()).toBe(false);
    expect(persistUserProfileMock).not.toHaveBeenCalled();
  });
});
