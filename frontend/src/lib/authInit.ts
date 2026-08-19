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
  // Returns BOTH the cached session and any read error. A transient read
  // failure (e.g. a refresh that failed on the network) must be distinguishable
  // from "genuinely no session" so the caller never manufactures a fresh
  // identity in response to a network blip.
  getSession(): Promise<{ session: AuthSessionLike | null; error: AuthErrorLike | null }>;
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
 * Classify a `getUser()` (or `getSession()`) outcome.
 *
 * The one property that must NOT be violated: a *transient* failure (network /
 * 429 / 5xx / anything we cannot be sure about) must NEVER be treated as "token
 * is invalid" — doing so silently signOut + creates a new anonymous identity,
 * i.e. silent UID drift.
 *
 * Only an explicit, definite rejection may count as `invalid`:
 *   - no session at all (user null + no error)
 *   - AuthSessionMissingError (no session)
 *   - AuthInvalidCredentialsError (credentials definitely rejected)
 *   - an HTTP 401/403 auth response
 *
 * Everything else — including a rate-limit 429, a 5xx, an unclassified 4xx, or
 * an unknown shape — is treated as `transient`, so the caller keeps the current
 * identity and surfaces a retryable error instead of rotating the UID.
 */
export function classifySession(
  data: { user: { id: string } | null } | null,
  error: AuthErrorLike | null,
): SessionVerdict {
  if (data?.user) return 'valid';

  if (!error) return 'invalid'; // user null with no error → no usable session

  // Definite invalidation signals (Supabase Auth error semantics).
  if (error.name === 'AuthSessionMissingError') return 'invalid';
  if (error.name === 'AuthInvalidCredentialsError') return 'invalid';
  if (error.name === 'AuthRetryableFetchError') return 'transient';

  const status = error.status;
  if (typeof status === 'number') {
    if (status === 401 || status === 403) return 'invalid';
    if (status === 429) return 'transient'; // rate limit — not a token problem
    if (status >= 500) return 'transient';
  }

  // Unclassified 4xx / unknown shape → be conservative: keep identity, surface
  // as retryable. Never infer invalidation from an ambiguous status.
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
 *  - destructive-side-effect ownership: the initializer performs NO destructive
 *    signOut. A stale attempt therefore can never clear a newer identity — the
 *    only way a stale attempt mutates local state is via signInAnonymously(),
 *    and after it is recognized as stale, `discardStale()` re-asserts the latest
 *    authoritative session (a write in the correct direction).
 */
export function createAuthInitializer(api: AuthApi): AuthInitializer {
  let attemptSeq = 0;
  let inFlight: { seq: number; promise: Promise<string> } | null = null;
  let authoritativeSession: { access_token: string; refresh_token: string } | null = null;

  const isStale = (seq: number) => seq !== attemptSeq;

  async function discardStale(): Promise<void> {
    // A superseded attempt may already have written its own session via
    // signInAnonymously(), overwriting the newer one. Re-assert the latest
    // authoritative session. If there is none yet, do NOTHING — the newer
    // attempt's own sign-in will overwrite whatever the stale attempt wrote.
    //
    // Deliberately NO signOut here: a destructive clear could race a newer
    // identity that is established concurrently, and is the exact bug this
    // module exists to prevent (destructive auth side-effect ownership).
    if (authoritativeSession) {
      try {
        await api.setSession(authoritativeSession);
      } catch {
        /* best-effort */
      }
    }
  }

  async function signIn(seq: number): Promise<string> {
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

  async function doEnsure(seq: number): Promise<string> {
    const { session, error: sessionError } = await api.getSession();
    if (isStale(seq)) throw new Error('Auth attempt superseded');

    if (!session) {
      // No cached session. If getSession itself failed transiently (a refresh /
      // network failure with no session in hand), surface a retryable error and
      // KEEP identity — never fall through to a fresh sign-in on a transient
      // read failure. A definite invalidation is the only path that proceeds.
      if (sessionError) {
        const verdict = classifySession(null, sessionError);
        if (verdict === 'transient') {
          throw new Error('Unable to read session (network). Please retry.');
        }
        // definite invalid → fall through to a fresh sign-in below
      }
      return signIn(seq);
    }

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
    if (verdict === 'transient') {
      // Transient: keep identity, surface a retryable error. Do NOT signOut.
      throw new Error('Unable to verify session (network). Please retry.');
    }

    // Definite invalidation: fall through to a fresh anonymous sign-in. There is
    // deliberately NO signOut before it — signInAnonymously() overwrites the
    // stale local session, and a destructive clear here could race a newer
    // attempt's identity (destructive auth side-effect ownership).
    return signIn(seq);
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
