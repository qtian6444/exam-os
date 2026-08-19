import { describe, it, expect, vi } from 'vitest';

// deepseek.ts pulls in getAccessToken from ./supabase (which createClient at
// module top-level). Mock it so the deadline helper is testable in Node.
vi.mock('./supabase', () => ({
  supabase: {},
  getAccessToken: vi.fn(),
  getAuthUserId: vi.fn(),
  ensureAnonymousSession: vi.fn(),
  resetAnonymousSessionInit: vi.fn(),
}));

import { withTimeout, TOTAL_TIMEOUT_MS } from './deepseek';

describe('withTimeout (total-deadline helper)', () => {
  it('resolves when the wrapped promise settles before the deadline', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok');
  });

  it('rejects with a recoverable TIMEOUT when the promise does not settle in time', async () => {
    const never = new Promise(() => {}); // never settles
    await expect(withTimeout(never, 20)).rejects.toMatchObject({
      code: 'TIMEOUT',
      recoverable: true,
    });
  });

  it('propagates the underlying rejection (does not mask it as a timeout)', async () => {
    const failing = Promise.reject(new Error('underlying failure'));
    await expect(withTimeout(failing, 1000)).rejects.toThrow('underlying failure');
  });
});

describe('TOTAL_TIMEOUT_MS', () => {
  it('is a single positive wall-clock budget for the whole action', () => {
    expect(TOTAL_TIMEOUT_MS).toBeGreaterThan(0);
  });
});
