import type { AccountCredentials } from './accountTypes';

export const PHONE_LENGTH = 11;
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 72;

const PHONE_PATTERN = /^1[3-9]\d{9}$/;

export interface FieldErrors {
  phone?: string;
  password?: string;
}

export const PHONE_EMPTY_MESSAGE = '请输入手机号';
export const PHONE_FORMAT_MESSAGE = '请输入正确的手机号';
export const PASSWORD_EMPTY_MESSAGE = '请输入密码';
export const PASSWORD_LENGTH_MESSAGE = '密码长度应为6至72位';

export function validatePhoneFormat(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return PHONE_EMPTY_MESSAGE;
  if (!PHONE_PATTERN.test(trimmed)) return PHONE_FORMAT_MESSAGE;
  return null;
}

export function validatePasswordFormat(password: string): string | null {
  if (!password) return PASSWORD_EMPTY_MESSAGE;
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return PASSWORD_LENGTH_MESSAGE;
  }
  return null;
}

export function validateAccountForm(
  credentials: AccountCredentials,
): FieldErrors {
  const errors: FieldErrors = {};
  const phoneError = validatePhoneFormat(credentials.phone);
  const passwordError = validatePasswordFormat(credentials.password);

  if (phoneError) errors.phone = phoneError;
  if (passwordError) {
    errors.password = passwordError;
  }

  return errors;
}

export function isLocalCredentialFormatValid(
  credentials: AccountCredentials,
): boolean {
  return Object.keys(validateAccountForm(credentials)).length === 0;
}
