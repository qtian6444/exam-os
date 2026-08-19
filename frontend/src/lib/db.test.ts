import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// db.ts pulls in the Supabase client at module top-level (createClient with
// import.meta.env). Mock it so the idempotency helpers are testable in Node
// without a real Supabase URL / anon key.
vi.mock('./supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
  getAuthUserId: vi.fn(),
}));

import { supabase } from './supabase';
import {
  stableUuid,
  isSameLearningOperation,
  resolveAbilitySnapshot,
  isProfileUpdateApplied,
  applyLearningEvidence,
  type ProfileAbilityRow,
} from './db';

const rpcMock = supabase.rpc as unknown as Mock;

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
  });

  it('resolves true on APPLIED_NEW and forwards the full atomic payload', async () => {
    rpcMock.mockResolvedValue({
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
    rpcMock.mockResolvedValue({
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
    rpcMock.mockResolvedValue({
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
    rpcMock.mockResolvedValue({ data: { status: 'WEIRD' }, error: null });

    const ok = await applyLearningEvidence({
      sessionId: 's1',
      cardId: 'c1',
      cardType: 'choice',
      correct: true,
    });

    expect(ok).toBe(false);
  });

  it('forwards p_skip_evidence true + p_correct null for preference cards', async () => {
    rpcMock.mockResolvedValue({
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
    rpcMock.mockResolvedValue({
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
});
