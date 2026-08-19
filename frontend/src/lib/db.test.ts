import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// db.ts pulls in the Supabase client at module top-level (createClient with
// import.meta.env). Mock it so the idempotency helpers are testable in Node
// without a real Supabase URL / anon key.
vi.mock('./supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
  getAuthUserId: vi.fn(),
}));

import { supabase, getAuthUserId } from './supabase';
import {
  stableUuid,
  isSameLearningOperation,
  resolveAbilitySnapshot,
  isProfileUpdateApplied,
  applyLearningEvidence,
  persistUserProfile,
  updateUserProfile,
  SAVE_TIMEOUT_MS,
  type ProfileAbilityRow,
} from './db';

const rpcMock = supabase.rpc as unknown as Mock;
const getAuthUserIdMock = getAuthUserId as unknown as Mock;

// applyLearningEvidence wires a bounded deadline through `.abortSignal()`. The
// mock rpc returns a builder-shaped object whose `.abortSignal()` yields the
// RPC's eventual `{ data, error }` (or settles on abort, mirroring the real
// fetch-cancellation semantics).
const abortSignalMock = vi.fn();

function mockRpcResult(result: { data: unknown; error: unknown }): void {
  abortSignalMock.mockResolvedValue(result);
}

describe('stableUuid (SHA-256 deterministic idempotency key)', () => {
  it('is deterministic: same seed → same UUID', async () => {
    const a = await stableUuid('session-1::card-1');
    const b = await stableUuid('session-1::card-1');
    expect(a).toBe(b);
  });

  it('different seeds → different UUIDs', async () => {
    const a = await stableUuid('session-1::card-1');
    const b = await stableUuid('session-1::card-2');
    const c = await stableUuid('session-2::card-1');
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(b).not.toBe(c);
  });

  it('emits an RFC-4122 v5-shaped UUID (version 5, variant 10xx)', async () => {
    const id = await stableUuid('some::seed');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('does not collide across a set of distinct logical operations', async () => {
    const seeds = Array.from({ length: 200 }, (_, i) => `session-${i}::card-${i % 7}`);
    const ids = await Promise.all(seeds.map((s) => stableUuid(s)));
    const unique = new Set(ids);
    expect(unique.size).toBe(seeds.length);
  });

  it('is NOT based on the old 32-bit FNV (separator-collidable) scheme', async () => {
    // A 128-bit SHA-256 digest means two different seeds cannot map to the same
    // key through a small-hash collision. Verify a boundary pair that the old
    // `::`-concatenation could not distinguish is still distinct at the UUID level.
    const a = await stableUuid('user::alpha::beta');
    const b = await stableUuid('user::alpha::beta::');
    expect(a).not.toBe(b);
  });
});

describe('isSameLearningOperation (23505 identity verification)', () => {
  const expected = { userId: 'u1', sessionId: 's1', cardId: 'c1' };

  it('matching row → idempotent success', () => {
    expect(isSameLearningOperation({ user_id: 'u1', session_id: 's1', card_id: 'c1' }, expected)).toBe(true);
  });
  it('different user → NOT the same operation', () => {
    expect(isSameLearningOperation({ user_id: 'u2', session_id: 's1', card_id: 'c1' }, expected)).toBe(false);
  });
  it('different session → NOT the same operation', () => {
    expect(isSameLearningOperation({ user_id: 'u1', session_id: 's2', card_id: 'c1' }, expected)).toBe(false);
  });
  it('different card → NOT the same operation', () => {
    expect(isSameLearningOperation({ user_id: 'u1', session_id: 's1', card_id: 'c2' }, expected)).toBe(false);
  });
  it('null row (unreadable, e.g. RLS-blocked) → NOT idempotent success', () => {
    expect(isSameLearningOperation(null, expected)).toBe(false);
  });
});

describe('resolveAbilitySnapshot (read error ≠ business zero)', () => {
  const row: ProfileAbilityRow = {
    ability_vocabulary: 0.5,
    ability_sentence: 0.3,
    ability_reading: 0.2,
    ability_listening: null,
    ability_writing: null,
    confidence_vocabulary: 0.4,
    confidence_sentence: 0.3,
    confidence_reading: 0.2,
    confidence_listening: null,
    confidence_writing: null,
  };

  it('a read error throws — never silently becomes a blank (0) snapshot', () => {
    expect(() => resolveAbilitySnapshot(null, { message: 'network down' })).toThrow(
      /read ability snapshot/,
    );
  });

  it('null data with no error → blank snapshot (legit no profile yet)', () => {
    const snap = resolveAbilitySnapshot(null, null);
    expect(snap.vocabulary).toBe(0);
    expect(snap.sentence).toBe(0);
  });

  it('data maps to a real snapshot (null fields default to 0)', () => {
    const snap = resolveAbilitySnapshot(row, null);
    expect(snap.vocabulary).toBe(0.5);
    expect(snap.listening).toBe(0);
  });
});

describe('isProfileUpdateApplied (0-rows ≠ success)', () => {
  it('null → false', () => {
    expect(isProfileUpdateApplied(null)).toBe(false);
  });
  it('empty array (0 rows) → false', () => {
    expect(isProfileUpdateApplied([])).toBe(false);
  });
  it('one or more rows → true', () => {
    expect(isProfileUpdateApplied([{ user_id: 'u1' }])).toBe(true);
  });
});

describe('applyLearningEvidence (atomic RPC — single-call persistence)', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    abortSignalMock.mockReset();
    rpcMock.mockReturnValue({ abortSignal: abortSignalMock });
  });

  it('resolves true on APPLIED_NEW and forwards the full logical payload', async () => {
    mockRpcResult({
      data: { status: 'APPLIED_NEW', learning_record_id: 'lr', evidence_applied: true },
      error: null,
    });

    const ok = await applyLearningEvidence({
      sessionId: 's1',
      cardId: 'c1',
      cardType: 'choice',
      correct: true,
      userAnswer: { selectedOptionId: 'a' },
    });

    expect(ok).toBe(true);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    // Every authoritative logical input that the server fingerprints must be
    // forwarded — a missing field would make the server-side fingerprint
    // degenerate and a payload change could slip through as idempotent.
    expect(rpcMock).toHaveBeenCalledWith('apply_learning_evidence', expect.objectContaining({
      p_operation_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      p_session_id: 's1',
      p_card_id: 'c1',
      p_card_type: 'choice',
      p_correct: true,
      p_user_answer: { selectedOptionId: 'a' },
      p_skip_evidence: false,
      p_difficulty: 0.4,
    }));
  });

  it('resolves true on IDEMPOTENT_ALREADY_APPLIED (lost-response retry)', async () => {
    mockRpcResult({
      data: { status: 'IDEMPOTENT_ALREADY_APPLIED', learning_record_id: 'lr', evidence_applied: false },
      error: null,
    });

    const ok = await applyLearningEvidence({
      sessionId: 's1',
      cardId: 'c1',
      cardType: 'choice',
      correct: true,
    });

    expect(ok).toBe(true);
  });

  it('resolves false when the RPC raises an error (transaction rolled back)', async () => {
    mockRpcResult({
      data: null,
      error: { message: 'PROFILE_NOT_FOUND', code: 'P0001' },
    });

    const ok = await applyLearningEvidence({
      sessionId: 's1',
      cardId: 'c1',
      cardType: 'choice',
      correct: true,
    });

    expect(ok).toBe(false);
  });

  it('resolves false on an unexpected status (never a silent success)', async () => {
    mockRpcResult({ data: { status: 'WEIRD' }, error: null });

    const ok = await applyLearningEvidence({
      sessionId: 's1',
      cardId: 'c1',
      cardType: 'choice',
      correct: true,
    });

    expect(ok).toBe(false);
  });

  it('forwards p_skip_evidence true + p_correct null for preference cards', async () => {
    mockRpcResult({
      data: { status: 'APPLIED_NEW', learning_record_id: 'lr', evidence_applied: false },
      error: null,
    });

    const ok = await applyLearningEvidence({
      sessionId: 's1',
      cardId: 'choice-welcome',
      cardType: 'choice',
      correct: null,
    });

    expect(ok).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('apply_learning_evidence', expect.objectContaining({
      p_card_id: 'choice-welcome',
      p_skip_evidence: true,
      p_correct: null,
    }));
  });

  it('uses difficulty 0.6 for reorder cards', async () => {
    mockRpcResult({
      data: { status: 'APPLIED_NEW', learning_record_id: 'lr', evidence_applied: true },
      error: null,
    });

    await applyLearningEvidence({
      sessionId: 's1',
      cardId: 'c1',
      cardType: 'reorder',
      correct: false,
    });

    expect(rpcMock).toHaveBeenCalledWith('apply_learning_evidence', expect.objectContaining({
      p_card_type: 'reorder',
      p_difficulty: 0.6,
      p_skip_evidence: false,
    }));
  });

  it('wires real cancellation via .abortSignal(AbortSignal) — not Promise.race', async () => {
    mockRpcResult({ data: { status: 'APPLIED_NEW' }, error: null });

    await applyLearningEvidence({
      sessionId: 's1',
      cardId: 'c1',
      cardType: 'choice',
      correct: true,
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(abortSignalMock).toHaveBeenCalledTimes(1);
    // The deadline must be a genuine AbortSignal handed to the fetch layer, so
    // the underlying request is actually cancelled (not merely raced).
    expect(abortSignalMock.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
  });

  it('aborts a never-settling RPC after SAVE_TIMEOUT_MS and returns false', async () => {
    vi.useFakeTimers();
    try {
      // Mirror real fetch-cancellation: the promise only settles (with an
      // AbortError) once the signal aborts.
      abortSignalMock.mockImplementation(
        (signal: AbortSignal) =>
          new Promise((resolve) => {
            const onAbort = () =>
              resolve({ data: null, error: { message: 'AbortError: The user aborted a request.' } });
            if (signal.aborted) onAbort();
            else signal.addEventListener('abort', onAbort);
          }),
      );

      const pending = applyLearningEvidence({
        sessionId: 's1',
        cardId: 'c1',
        cardType: 'choice',
        correct: true,
      });

      // Flush the leading stableUuid microtask so the deadline timer is
      // registered, then advance the clock past SAVE_TIMEOUT_MS to fire abort.
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(SAVE_TIMEOUT_MS + 1);

      await expect(pending).resolves.toBe(false);
      expect(abortSignalMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('treats an abort (deadline) as failure — never a silent success', async () => {
    mockRpcResult({ data: null, error: { message: 'AbortError: The user aborted a request.' } });

    const ok = await applyLearningEvidence({
      sessionId: 's1',
      cardId: 'c1',
      cardType: 'choice',
      correct: true,
    });

    expect(ok).toBe(false);
  });

  it('retry of the same (session, card) forwards the SAME operation id', async () => {
    mockRpcResult({ data: { status: 'APPLIED_NEW' }, error: null });

    await applyLearningEvidence({ sessionId: 's1', cardId: 'c1', cardType: 'choice', correct: true });
    await applyLearningEvidence({ sessionId: 's1', cardId: 'c1', cardType: 'choice', correct: true });

    expect(rpcMock).toHaveBeenCalledTimes(2);
    const first = rpcMock.mock.calls[0][1].p_operation_id;
    const second = rpcMock.mock.calls[1][1].p_operation_id;
    expect(typeof first).toBe('string');
    expect(second).toBe(first);
  });
});

// ── R8: profile persistence column-ownership contract ──
//
// ENG-R7-001: the old merge-upsert folded user_id into the UPDATE set and would
// have required UPDATE(user_id) (owner immutability violation). The CREATE path
// must send identity + editable columns; the UPDATE path must send editable
// columns only (no user_id, no authoritative fields). These tests assert the
// actual operation/payload handed to the Supabase query builder — not just the
// helper return value.
describe('persistUserProfile / updateUserProfile (profile column-ownership contract)', () => {
  const fromMock = supabase.from as unknown as Mock;
  const insertMock = vi.fn();
  const updateMock = vi.fn();
  const eqMock = vi.fn();
  const selectMock = vi.fn();
  const updateChain = { eq: eqMock, select: selectMock };

  beforeEach(() => {
    fromMock.mockReset();
    insertMock.mockReset();
    updateMock.mockReset();
    eqMock.mockReset();
    selectMock.mockReset();
    getAuthUserIdMock.mockReset();

    getAuthUserIdMock.mockResolvedValue('uid-123');
    eqMock.mockReturnValue(updateChain);
    updateMock.mockReturnValue(updateChain);
    fromMock.mockReturnValue({ insert: insertMock, update: updateMock });
  });

  const profile = {
    examType: 'CET4',
    examBatch: '2026-12',
    dailyTime: '20min',
  } as const;

  it('CREATE path: INSERT sends user_id + editable columns, no authoritative fields', async () => {
    insertMock.mockResolvedValue({ data: null, error: null });

    const uid = await persistUserProfile(profile);

    expect(uid).toBe('uid-123');
    expect(fromMock).toHaveBeenCalledWith('user_profile');
    expect(insertMock).toHaveBeenCalledTimes(1);
    const payload = insertMock.mock.calls[0][0];
    expect(payload).toEqual({
      user_id: 'uid-123',
      exam_type: 'CET4',
      exam_batch: '2026-12',
      daily_time: '20min',
      updated_at: expect.any(String),
    });
    expect(payload).not.toHaveProperty('ability_sentence');
    expect(payload).not.toHaveProperty('confidence_sentence');
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('UPDATE path (duplicate user_id): UPDATE sends editable columns only — no user_id, no authoritative', async () => {
    insertMock.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } });
    selectMock.mockResolvedValue({ data: [{ user_id: 'uid-123' }], error: null });

    const uid = await persistUserProfile(profile);

    expect(uid).toBe('uid-123');
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledTimes(1);
    const payload = updateMock.mock.calls[0][0];
    expect(payload).toEqual({
      exam_type: 'CET4',
      exam_batch: '2026-12',
      daily_time: '20min',
      updated_at: expect.any(String),
    });
    expect(payload).not.toHaveProperty('user_id');
    expect(payload).not.toHaveProperty('ability_sentence');
    expect(payload).not.toHaveProperty('confidence_sentence');
    expect(eqMock).toHaveBeenCalledWith('user_id', 'uid-123');
    expect(selectMock).toHaveBeenCalledWith('user_id');
  });

  it('updateUserProfile directly: UPDATE payload has no user_id and no authoritative fields', async () => {
    selectMock.mockResolvedValue({ data: [{ user_id: 'uid-123' }], error: null });

    const uid = await updateUserProfile(profile);

    expect(uid).toBe('uid-123');
    expect(updateMock).toHaveBeenCalledTimes(1);
    const payload = updateMock.mock.calls[0][0];
    const authoritative = [
      'ability_vocabulary', 'ability_sentence', 'ability_reading', 'ability_listening', 'ability_writing',
      'confidence_vocabulary', 'confidence_sentence', 'confidence_reading', 'confidence_listening', 'confidence_writing',
    ];
    expect(payload).not.toHaveProperty('user_id');
    for (const col of authoritative) {
      expect(payload).not.toHaveProperty(col);
    }
    expect(eqMock).toHaveBeenCalledWith('user_id', 'uid-123');
  });

  it('CREATE path sends no arbitrary ability/confidence fields', async () => {
    insertMock.mockResolvedValue({ data: null, error: null });
    await persistUserProfile(profile);
    const payload = insertMock.mock.calls[0][0];
    const authoritative = [
      'ability_vocabulary', 'ability_sentence', 'ability_reading', 'ability_listening', 'ability_writing',
      'confidence_vocabulary', 'confidence_sentence', 'confidence_reading', 'confidence_listening', 'confidence_writing',
    ];
    for (const col of authoritative) {
      expect(payload).not.toHaveProperty(col);
    }
  });

  it('DB failure (non-23505) is NOT swallowed and does NOT fall through to update', async () => {
    insertMock.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } });

    const uid = await persistUserProfile(profile);

    expect(uid).toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('updateUserProfile with 0 rows (cross-user / missing) → null, never silent success', async () => {
    selectMock.mockResolvedValue({ data: [], error: null });

    const uid = await updateUserProfile(profile);

    expect(uid).toBeNull();
  });
});
