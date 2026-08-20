import { supabase } from '../../lib/supabase';
import type {
  AccountCredentials,
  AccountIdentity,
  LoginResult,
} from './accountTypes';

export interface PasswordAuthClient {
  signInWithPassword(credentials: {
    phone: string;
    password: string;
  }): Promise<{
    data: { user: unknown | null; session: unknown | null };
    error: unknown | null;
  }>;
}

interface AuthErrorShape {
  name?: unknown;
  status?: unknown;
  code?: unknown;
  message?: unknown;
}

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

export function mapAuthErrorToLoginResult(error: unknown): LoginResult {
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
  auth: PasswordAuthClient = supabase.auth as PasswordAuthClient,
): Promise<LoginResult> {
  let phone: string;
  try {
    phone = normalizePhoneToE164(credentials.phone);
  } catch {
    return 'INVALID_CREDENTIALS';
  }

  try {
    const { data, error } = await auth.signInWithPassword({
      phone,
      password: credentials.password,
    });

    if (error) return mapAuthErrorToLoginResult(error);
    if (!data.user || !data.session) return 'UNKNOWN_ERROR';
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
