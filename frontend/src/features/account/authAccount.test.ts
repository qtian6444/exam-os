import { describe, expect, it, vi } from 'vitest';
import {
  classifyAccountIdentity,
  loginWithPhonePassword,
  mapAuthErrorToLoginResult,
  normalizePhoneToE164,
} from './authAccount';
import type { PasswordAuthClient } from './authAccount';

const CREDENTIALS = { phone: '13812345678', password: '345678' };

function authResponse(
  response: Awaited<ReturnType<PasswordAuthClient['signInWithPassword']>>,
): PasswordAuthClient {
  return {
    signInWithPassword: vi.fn(async () => response),
  };
}

describe('normalizePhoneToE164', () => {
  it('normalizes a mainland number and preserves an existing +86 number', () => {
    expect(normalizePhoneToE164('13812345678')).toBe('+8613812345678');
    expect(normalizePhoneToE164(' +8613812345678 ')).toBe(
      '+8613812345678',
    );
  });

  it('rejects malformed input', () => {
    expect(() => normalizePhoneToE164('123')).toThrow('Invalid phone format');
  });
});

describe('mapAuthErrorToLoginResult', () => {
  it('maps credentials, network, rate-limit, and unknown failures', () => {
    expect(mapAuthErrorToLoginResult({ status: 400 })).toBe(
      'INVALID_CREDENTIALS',
    );
    expect(
      mapAuthErrorToLoginResult({ name: 'AuthRetryableFetchError' }),
    ).toBe('NETWORK_ERROR');
    expect(mapAuthErrorToLoginResult({ status: 429 })).toBe('RATE_LIMITED');
    expect(mapAuthErrorToLoginResult({ status: 422 })).toBe('UNKNOWN_ERROR');
  });
});

describe('loginWithPhonePassword', () => {
  it('calls Supabase password auth with normalized credentials', async () => {
    const auth = authResponse({
      data: { user: { id: 'permanent-user' }, session: { access_token: 'jwt' } },
      error: null,
    });

    await expect(loginWithPhonePassword(CREDENTIALS, auth)).resolves.toBe(
      'SUCCESS',
    );
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      phone: '+8613812345678',
      password: '345678',
    });
  });

  it('returns a safe mapped failure and never signs out the anonymous user', async () => {
    const auth = authResponse({
      data: { user: null, session: null },
      error: { name: 'AuthInvalidCredentialsError', message: 'raw provider text' },
    });

    await expect(loginWithPhonePassword(CREDENTIALS, auth)).resolves.toBe(
      'INVALID_CREDENTIALS',
    );
    expect(Object.keys(auth)).toEqual(['signInWithPassword']);
  });

  it('maps a rejected network call without exposing the provider error', async () => {
    const auth: PasswordAuthClient = {
      signInWithPassword: vi.fn(async () => {
        throw new TypeError('Failed to fetch provider endpoint');
      }),
    };

    await expect(loginWithPhonePassword(CREDENTIALS, auth)).resolves.toBe(
      'NETWORK_ERROR',
    );
  });
});

describe('classifyAccountIdentity', () => {
  it('uses only user.is_anonymous', () => {
    expect(classifyAccountIdentity({ is_anonymous: true })).toBe('ANONYMOUS');
    expect(classifyAccountIdentity({ is_anonymous: false })).toBe('PERMANENT');
    expect(classifyAccountIdentity({})).toBe('PERMANENT');
  });
});
