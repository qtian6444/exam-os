// ── Auth initialization: single-flight + attempt generation ownership ──
//
// This module is the testable core of `ensureAnonymousSession`. It owns the
// rules for turning a cached/absent Supabase session into one *authoritative*
// anonymous identity, and for making sure a late, superseded attempt can never
// overwrite a newer one.
//
// It is kept free of the Supabase client itself (it only talks to a narrow
// AuthApi) so the single-flight / generation / transient-vs-invalid logic can
// be exercised deterministically in tests.

export interface AuthSessionLike {
  user: { id: string };
  access_token: string;
  refresh_token: string;
}

export interface AuthErrorLike {
  name?: string;
  status?: number;
  message?: string;
}

export interface AuthApi {
  getSession(): Promise<{ session: AuthSessionLike | null }>;
  getUser(): Promise<{
    data: { user: { id: string } | null } | null;
    error: AuthErrorLike | null;
  }>;
  signInAnonymously(): Promise<{
    data: { user: { id: string } | null; session: AuthSessionLike | null } | null;
    error: AuthErrorLike | null;
  }>;
  signOut(options?: { scope?: 'local' | 'global' }): Promise<unknown>;
  setSession(session: { access_token: string; refresh_token: string }): Promise<unknown>;
}

export type SessionVerdict = 'valid' | 'invalid' | 'transient';

/**
 * Classify a `getUser()` outcome.
 *
 * The one property that must NOT be violated: a *transient* failure (network /
 * 5xx / anything we cannot be sure about) must NEVER be treated as "token is
 * invalid" — doing so silently signOut + creates a new anonymous identity, i.e.
 * silent UID drift.
 *
 * Only an explicit, definite rejection (no session, AuthSessionMissingError, or
 * a 401/403 auth response) may count as `invalid`.
 */
export function classifySession(data: { user: { id: string } | null } | null, error: AuthErrorLike | null): SessionVerdict {
  if (data?.user) return 'valid';

  if (!error) return 'invalid'; // user null with no error → no usable session

  if (error.name === 'AuthSessionMissingError') return 'invalid';
  if (error.name === 'AuthRetryableFetchError') return 'transient';

  const status = error.status;
  if (typeof status === 'number') {
    if (status === 401 || status === 403) return 'invalid';
    if (status >= 500) return 'transient';
    return 'invalid';
  }

  // Unknown shape → be conservative: keep identity, surface as retryable.
  return 'transient';
}

export interface AuthInitializer {
  ensure(): Promise<string>;
  reset(): void;
}

/**
 * Build the anonymous-session initializer.
 *
 * Guarantees:
 *  - single-flight: concurrent `ensure()` calls share ONE underlying attempt.
 *  - generation ownership: once a newer attempt starts (via `reset()` + a fresh
 *    `ensure()`), any still-in-flight older attempt is discarded and, if it was
 *    in the middle of writing a session, the authoritative one is re-asserted.
 */
export function createAuthInitializer(api: AuthApi): AuthInitializer {
  let attemptSeq = 0;
  let inFlight: { seq: number; promise: Promise<string> } | null = null;
  let authoritativeSession: { access_token: string; refresh_token: string } | null = null;

  const isStale = (seq: number) => seq !== attemptSeq;

  async function discardStale(): Promise<void> {
    // A superseded attempt may already have written its own session via
    // signInAnonymously(). Re-assert the latest authoritative session, or clear
    // local state if we have none yet.
    if (authoritativeSession) {
      try {
        await api.setSession(authoritativeSession);
      } catch {
        /* best-effort */
      }
    } else {
      try {
        await api.signOut({ scope: 'local' });
      } catch {
        /* best-effort */
      }
    }
  }

  async function doEnsure(seq: number): Promise<string> {
    const { session } = await api.getSession();
    if (isStale(seq)) throw new Error('Auth attempt superseded');

    if (session) {
      const { data, error } = await api.getUser();
      if (isStale(seq)) throw new Error('Auth attempt superseded');

      const verdict = classifySession(data, error);
      if (verdict === 'valid') {
        authoritativeSession = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        };
        return session.user.id;
      }
      if (verdict === 'invalid') {
        // Definite invalidation only: clear and fall through to fresh sign-in.
        await api.signOut({ scope: 'local' });
        if (isStale(seq)) throw new Error('Auth attempt superseded');
      } else {
        // Transient: keep identity, surface a retryable error. Do NOT signOut.
        throw new Error('Unable to verify session (network). Please retry.');
      }
    }

    const { data, error } = await api.signInAnonymously();
    if (isStale(seq)) {
      await discardStale();
      throw new Error('Auth attempt superseded');
    }
    if (error || !data?.user || !data.session) {
      throw new Error(error?.message ?? 'Anonymous sign-in failed');
    }
    authoritativeSession = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    };
    return data.user.id;
  }

  function ensure(): Promise<string> {
    if (inFlight) return inFlight.promise;
    const seq = ++attemptSeq;
    const promise = doEnsure(seq).finally(() => {
      if (inFlight && inFlight.seq === seq) inFlight = null;
    });
    inFlight = { seq, promise };
    return promise;
  }

  function reset(): void {
    // Abandon any in-flight attempt and advance the generation so a late
    // resolution of the old attempt is recognized as stale.
    inFlight = null;
    attemptSeq += 1;
  }

  return { ensure, reset };
}
