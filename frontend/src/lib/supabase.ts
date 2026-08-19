import { createClient } from '@supabase/supabase-js';
import { createAuthInitializer } from './authInit';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
  return initializer.ensure();
}

/**
 * Abandon the current in-flight auth attempt so a retry starts a fresh
 * generation. Safe to call when nothing is in flight (no-op).
 */
export function resetAnonymousSessionInit(): void {
  initializer.reset();
}

/**
 * Current authenticated user id (auth.uid()), the only data-ownership identity.
 * Call only after ensureAnonymousSession() has succeeded.
 */
export async function getAuthUserId(): Promise<string> {
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
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('No authenticated session');
  }
  return token;
}
