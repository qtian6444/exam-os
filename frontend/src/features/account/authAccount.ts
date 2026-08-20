import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import type {
  AccountCredentials,
  AccountIdentity,
  AuthSessionTokens,
  PasswordLoginAttempt,
  LoginFailure,
  LoginResult,
} from './accountTypes';

interface PasswordAuthUser {
  id?: string;
  is_anonymous?: boolean;
}

export interface PasswordAuthClient {
  signInWithPassword(credentials: {
    phone: string;
    password: string;
  }): Promise<{
    data: {
      user: PasswordAuthUser | null;
      session: AuthSessionTokens | null;
    };
    error: unknown | null;
  }>;
}

export interface SessionActivationClient {
  setSession(session: AuthSessionTokens): Promise<{
    data: { user: PasswordAuthUser | null; session: unknown | null };
    error: unknown | null;
  }>;
}

interface AuthErrorShape {
  name?: unknown;
  status?: unknown;
  code?: unknown;
  message?: unknown;
}

const verificationClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'exam-os-account-login-verification',
    },
  },
);

const passwordVerifier = verificationClient.auth as PasswordAuthClient;
const sessionActivator = supabase.auth as SessionActivationClient;

const MAINLAND_PHONE_PATTERN = /^1[3-9]\d{9}$/;
const E164_MAINLAND_PHONE_PATTERN = /^\+861[3-9]\d{9}$/;

export function normalizePhoneToE164(phone: string): string {
  const trimmed = phone.trim();
  if (E164_MAINLAND_PHONE_PATTERN.test(trimmed)) return trimmed;
  if (MAINLAND_PHONE_PATTERN.test(trimmed)) return `+86${trimmed}`;
  throw new Error('Invalid phone format');
}

function asAuthError(error: unknown): AuthErrorShape {
  if (typeof error !== 'object' || error === null) return {};
  return error as AuthErrorShape;
}

export function mapAuthErrorToLoginResult(error: unknown): LoginFailure {
  const authError = asAuthError(error);
  const name = typeof authError.name === 'string' ? authError.name : '';
  const code = typeof authError.code === 'string' ? authError.code : '';
  const status = typeof authError.status === 'number' ? authError.status : null;
  const message = typeof authError.message === 'string' ? authError.message : '';

  if (
    status === 429 ||
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    code === 'over_sms_send_rate_limit'
  ) {
    return 'RATE_LIMITED';
  }

  if (
    name === 'AuthRetryableFetchError' ||
    name === 'TypeError' ||
    status === 0 ||
    (status !== null && status >= 500) ||
    /failed to fetch|network|load failed/i.test(message)
  ) {
    return 'NETWORK_ERROR';
  }

  if (
    name === 'AuthInvalidCredentialsError' ||
    code === 'invalid_credentials' ||
    status === 400 ||
    status === 401 ||
    status === 403
  ) {
    return 'INVALID_CREDENTIALS';
  }

  return 'UNKNOWN_ERROR';
}

export async function loginWithPhonePassword(
  credentials: AccountCredentials,
  auth: PasswordAuthClient = passwordVerifier,
): Promise<PasswordLoginAttempt> {
  let phone: string;
  try {
    phone = normalizePhoneToE164(credentials.phone);
  } catch {
    return { result: 'INVALID_CREDENTIALS' };
  }

  try {
    const { data, error } = await auth.signInWithPassword({
      phone,
      password: credentials.password,
    });

    if (error) return { result: mapAuthErrorToLoginResult(error) };
    if (
      !data.user ||
      !data.session?.access_token ||
      !data.session.refresh_token ||
      classifyAccountIdentity(data.user) !== 'PERMANENT'
    ) {
      return { result: 'UNKNOWN_ERROR' };
    }
    return {
      result: 'SUCCESS',
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    };
  } catch (error) {
    return { result: mapAuthErrorToLoginResult(error) };
  }
}

export async function activateAccountSession(
  session: AuthSessionTokens,
  auth: SessionActivationClient = sessionActivator,
): Promise<LoginResult> {
  try {
    const { data, error } = await auth.setSession(session);
    if (error) return mapAuthErrorToLoginResult(error);
    if (
      !data.user ||
      !data.session ||
      classifyAccountIdentity(data.user) !== 'PERMANENT'
    ) {
      return 'UNKNOWN_ERROR';
    }
    return 'SUCCESS';
  } catch (error) {
    return mapAuthErrorToLoginResult(error);
  }
}

export function classifyAccountIdentity(user: {
  is_anonymous?: boolean;
}): AccountIdentity {
  return user.is_anonymous === true ? 'ANONYMOUS' : 'PERMANENT';
}

export async function getCurrentAccountIdentity(): Promise<AccountIdentity> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Unable to read account identity');
  return classifyAccountIdentity(data.user);
}
