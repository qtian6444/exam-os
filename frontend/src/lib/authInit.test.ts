import { describe, it, expect } from 'vitest';
import {
  createAuthInitializer,
  classifySession,
  type AuthApi,
  type AuthSessionLike,
  type AuthErrorLike,
} from './authInit';

interface Calls {
  getSession: number;
  getUser: number;
  signIn: number;
  signOut: number;
  setSession: number;
}

const SESSION_A: AuthSessionLike = { user: { id: 'uid-A' }, access_token: 'tokA', refresh_token: 'refA' };
const SESSION_B: AuthSessionLike = { user: { id: 'uid-B' }, access_token: 'tokB', refresh_token: 'refB' };

type SignInResult = {
  data: { user: { id: string } | null; session: AuthSessionLike | null } | null;
  error: AuthErrorLike | null;
};

type ApiOverride = {
  getSession?: () => { session: AuthSessionLike | null; error: AuthErrorLike | null };
  getUser?: () => { data: { user: { id: string } | null } | null; error: AuthErrorLike | null };
  signInAnonymously?: () => SignInResult | Promise<SignInResult>;
  signOut?: (opts?: { scope?: 'local' | 'global' }) => unknown;
  setSession?: (s: { access_token: string; refresh_token: string }) => unknown;
};

function makeApi(overrides: ApiOverride = {}) {
  const calls: Calls = { getSession: 0, getUser: 0, signIn: 0, signOut: 0, setSession: 0 };
  const api: AuthApi = {
    async getSession() {
      calls.getSession++;
      return overrides.getSession ? overrides.getSession() : { session: null, error: null };
    },
    async getUser() {
      calls.getUser++;
      return overrides.getUser
        ? overrides.getUser()
        : { data: { user: { id: 'u1' } }, error: null };
    },
    async signInAnonymously() {
      calls.signIn++;
      return overrides.signInAnonymously
        ? overrides.signInAnonymously()
        : { data: { user: { id: 'u1' }, session: { user: { id: 'u1' }, access_token: 't', refresh_token: 'r' } }, error: null };
    },
    async signOut(opts?: { scope?: 'local' | 'global' }) {
      calls.signOut++;
      return overrides.signOut ? overrides.signOut(opts) : { error: null };
    },
    async setSession(s: { access_token: string; refresh_token: string }) {
      calls.setSession++;
      return overrides.setSession ? overrides.setSession(s) : { error: null };
    },
  };
  return { api, calls };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('classifySession (transient vs definitive invalid)', () => {
  it('valid user → valid', () => {
    expect(classifySession({ user: { id: 'x' } }, null)).toBe('valid');
  });
  it('user null + no error → invalid', () => {
    expect(classifySession({ user: null }, null)).toBe('invalid');
  });
  it('AuthSessionMissingError → invalid', () => {
    expect(classifySession({ user: null }, { name: 'AuthSessionMissingError' })).toBe('invalid');
  });
  it('AuthInvalidCredentialsError → invalid', () => {
    expect(classifySession({ user: null }, { name: 'AuthInvalidCredentialsError' })).toBe('invalid');
  });
  it('AuthRetryableFetchError → transient', () => {
    expect(classifySession({ user: null }, { name: 'AuthRetryableFetchError' })).toBe('transient');
  });
  it('status 401 → invalid', () => {
    expect(classifySession({ user: null }, { status: 401 })).toBe('invalid');
  });
  it('status 403 → invalid', () => {
    expect(classifySession({ user: null }, { status: 403 })).toBe('invalid');
  });
  it('status 429 (rate limit) → transient, NOT invalid', () => {
    expect(classifySession({ user: null }, { status: 429 })).toBe('transient');
  });
  it('status 400 (unclassified 4xx) → transient (conservative)', () => {
    expect(classifySession({ user: null }, { status: 400 })).toBe('transient');
  });
  it('status 503 → transient', () => {
    expect(classifySession({ user: null }, { status: 503 })).toBe('transient');
  });
  it('unknown error shape → transient (conservative)', () => {
    expect(classifySession({ user: null }, {})).toBe('transient');
  });
});

describe('createAuthInitializer — single-flight', () => {
  it('concurrent ensure() shares ONE sign-in', async () => {
    let signInCount = 0;
    const { api } = makeApi({
      signInAnonymously: () => {
        signInCount++;
        return { data: { user: { id: 'u1' }, session: { user: { id: 'u1' }, access_token: 't', refresh_token: 'r' } }, error: null };
      },
    });
    const init = createAuthInitializer(api);
    const [a, b, c] = await Promise.all([init.ensure(), init.ensure(), init.ensure()]);
    expect(a).toBe('u1');
    expect(b).toBe('u1');
    expect(c).toBe('u1');
    expect(signInCount).toBe(1);
  });
});

describe('createAuthInitializer — transient failure keeps identity', () => {
  it('valid session + transient getUser → retryable error, NO signOut, NO sign-in', async () => {
    const { api, calls } = makeApi({
      getSession: () => ({ session: SESSION_A, error: null }),
      getUser: () => ({ data: { user: null }, error: { name: 'AuthRetryableFetchError' } }),
    });
    const init = createAuthInitializer(api);
    await expect(init.ensure()).rejects.toThrow(/retry/i);
    expect(calls.signOut).toBe(0);
    expect(calls.signIn).toBe(0);
  });

  it('getSession transient error + no session → retryable error, NO sign-in (no UID drift)', async () => {
    const { api, calls } = makeApi({
      getSession: () => ({ session: null, error: { name: 'AuthRetryableFetchError' } }),
    });
    const init = createAuthInitializer(api);
    await expect(init.ensure()).rejects.toThrow(/retry/i);
    expect(calls.signIn).toBe(0);
  });
});

describe('createAuthInitializer — destructive side-effect ownership', () => {
  it('definite invalid token → fresh sign-in WITHOUT destructive signOut', async () => {
    const { api, calls } = makeApi({
      getSession: () => ({ session: SESSION_A, error: null }),
      getUser: () => ({ data: { user: null }, error: { name: 'AuthSessionMissingError' } }),
      signInAnonymously: () => ({ data: { user: { id: 'uid-B' }, session: SESSION_B }, error: null }),
    });
    const init = createAuthInitializer(api);
    const uid = await init.ensure();
    expect(uid).toBe('uid-B');
    expect(calls.signOut).toBe(0); // no destructive clear of a possibly-newer identity
    expect(calls.signIn).toBe(1);
  });

  it('a stale sign-in is re-asserted via setSession (never signOut)', async () => {
    const oldSignIn = deferred<{
      data: { user: { id: string } | null; session: AuthSessionLike | null } | null;
      error: AuthErrorLike | null;
    }>();
    let signInCalls = 0;
    let signInStarted!: () => void;
    const signInStartedPromise = new Promise<void>((res) => (signInStarted = res));
    let lastSetSession: { access_token: string; refresh_token: string } | null = null;

    const { api, calls } = makeApi({
      getSession: () => ({ session: null, error: null }),
      signInAnonymously: () => {
        signInCalls++;
        if (signInCalls === 1) {
          signInStarted();
          return oldSignIn.promise;
        }
        return { data: { user: { id: 'uid-B' }, session: SESSION_B }, error: null };
      },
      setSession: (s: { access_token: string; refresh_token: string }) => {
        lastSetSession = s;
        return { error: null };
      },
    });

    const init = createAuthInitializer(api);
    const firstEnsure = init.ensure();
    const firstErr = firstEnsure.catch((e) => e);

    await signInStartedPromise; // attempt 1 now hanging at sign-in

    init.reset();
    const uidB = await init.ensure();
    expect(uidB).toBe('uid-B');

    // Stale attempt 1 finally resolves with a DIFFERENT identity.
    oldSignIn.resolve({ data: { user: { id: 'uid-A' }, session: SESSION_A }, error: null });
    const staleResult = await firstErr;
    expect(staleResult).toBeInstanceOf(Error);
    expect(String(staleResult)).toMatch(/superseded/i);

    // Authoritative session re-asserted to B, and NO destructive signOut was used.
    expect((lastSetSession as { access_token: string } | null)?.access_token).toBe('tokB');
    expect(calls.signOut).toBe(0);
  });
});

describe('createAuthInitializer — generation ownership', () => {
  it('reset() abandons the in-flight attempt and a late resolution is discarded', async () => {
    const oldSignIn = deferred<{
      data: { user: { id: string } | null; session: AuthSessionLike | null } | null;
      error: AuthErrorLike | null;
    }>();
    let signInCalls = 0;
    let signInStarted!: () => void;
    const signInStartedPromise = new Promise<void>((res) => (signInStarted = res));

    const { api } = makeApi({
      getSession: () => ({ session: null, error: null }),
      signInAnonymously: () => {
        signInCalls++;
        if (signInCalls === 1) {
          signInStarted();
          return oldSignIn.promise;
        }
        return { data: { user: { id: 'uid-B' }, session: SESSION_B }, error: null };
      },
    });

    const init = createAuthInitializer(api);
    const firstEnsure = init.ensure();
    const firstErr = firstEnsure.catch((e) => e);

    await signInStartedPromise;
    init.reset();
    expect(await init.ensure()).toBe('uid-B');

    oldSignIn.resolve({ data: { user: { id: 'uid-A' }, session: SESSION_A }, error: null });
    const staleResult = await firstErr;
    expect(staleResult).toBeInstanceOf(Error);
    expect(String(staleResult)).toMatch(/superseded/i);
  });
});
