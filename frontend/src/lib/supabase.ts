import { createClient } from '@supabase/supabase-js';
import { createAuthInitializer } from './authInit';

const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const configuredAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * A checkout without `.env.local` must still be able to render the guest demo.
 * This flag is deliberately exported instead of inferring configuration from a
 * failed request: a network failure in a configured production project must
 * remain an error, never silently become an offline demo.
 */
export const isSupabaseConfigured = Boolean(configuredUrl && configuredAnonKey);

/**
 * `createClient` is module-scoped, so it needs syntactically valid values even
 * for an unconfigured local checkout. The `.invalid` TLD cannot resolve; no
 * account or cloud write is attempted while `isSupabaseConfigured` is false.
 */
export const supabaseRuntimeConfig = {
  url: isSupabaseConfigured
    ? configuredUrl!
    : 'https://exam-os-local-demo.invalid',
  anonKey: isSupabaseConfigured
    ? configuredAnonKey!
    : 'exam-os-local-demo-not-a-secret',
} as const;

export const LOCAL_DEMO_USER_ID = 'local-demo-guest';

export const supabase = createClient(supabaseRuntimeConfig.url, supabaseRuntimeConfig.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Wire the real Supabase auth client into the testable initializer.
const initializer = createAuthInitializer({
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    const s = data.session;
    return {
      session: s
        ? {
            user: { id: s.user.id },
            access_token: s.access_token,
            refresh_token: s.refresh_token ?? '',
          }
        : null,
      // Preserve the read error (if any) so the initializer can distinguish a
      // transient refresh/network failure from a genuinely absent session — and
      // never rotates the anonymous identity on a network blip.
      error: error
        ? { name: error.name, status: (error as { status?: number }).status, message: error.message }
        : null,
    };
  },
  async getUser() {
    return supabase.auth.getUser();
  },
  async signInAnonymously() {
    return supabase.auth.signInAnonymously();
  },
  async signOut(options) {
    return supabase.auth.signOut(options);
  },
  async setSession(session) {
    return supabase.auth.setSession(session);
  },
});

/**
 * Ensure an anonymous Supabase Auth session exists.
 *
 * Exam OS keeps a no-login experience: the first visit auto-creates an
 * anonymous session, and auth.uid() becomes the real data-ownership identity.
 *
 * Single-flight: concurrent calls share one attempt. Generation ownership: a
 * stale attempt (abandoned by a timeout/retry) can never overwrite the newer
 * identity. A transient network failure while verifying a cached session is
 * surfaced as a retryable error and never triggers signOut / UID drift.
 *
 * Returns the auth user id. Throws on failure — the app must surface a clear
 * error/retry state, never silently fall back to unauthenticated writes.
 */
export function ensureAnonymousSession(): Promise<string> {
  if (!isSupabaseConfigured) return Promise.resolve(LOCAL_DEMO_USER_ID);
  return initializer.ensure();
}

/**
 * Abandon the current in-flight auth attempt so a retry starts a fresh
 * generation. Safe to call when nothing is in flight (no-op).
 */
export function resetAnonymousSessionInit(): void {
  if (!isSupabaseConfigured) return;
  initializer.reset();
}

/**
 * Current authenticated user id (auth.uid()), the only data-ownership identity.
 * Call only after ensureAnonymousSession() has succeeded.
 */
export async function getAuthUserId(): Promise<string> {
  if (!isSupabaseConfigured) return LOCAL_DEMO_USER_ID;
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) {
    throw new Error('No authenticated session');
  }
  return uid;
}

/**
 * Current session access token (JWT). Sent explicitly to Edge Functions so the
 * Supabase platform can verify the caller's identity (verify_jwt=true).
 * Call only after ensureAnonymousSession() has succeeded.
 */
export async function getAccessToken(): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured for this local demo');
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('No authenticated session');
  }
  return token;
}
