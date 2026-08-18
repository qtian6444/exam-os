import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/**
 * Ensure an anonymous Supabase Auth session exists.
 *
 * Exam OS keeps a no-login experience: the first visit auto-creates an
 * anonymous session, and auth.uid() becomes the real data-ownership identity.
 *
 * Returns the auth user id. Throws on failure — the app must surface a clear
 * error/retry state, never silently fall back to unauthenticated writes.
 */
export async function ensureAnonymousSession(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    return sessionData.session.user.id;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(error?.message ?? 'Anonymous sign-in failed');
  }
  return data.user.id;
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
