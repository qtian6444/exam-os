import type { AccountCredentials } from './accountTypes';

export const PHONE_LENGTH = 11;
export const PASSWORD_LENGTH = 6;

const PHONE_PATTERN = /^1[3-9]\d{9}$/;
const PASSWORD_PATTERN = /^\d{6}$/;

export interface FieldErrors {
  phone?: string;
  password?: string;
}

export const PHONE_EMPTY_MESSAGE = '请输入手机号';
export const PHONE_FORMAT_MESSAGE = '请输入正确的手机号';
export const PASSWORD_EMPTY_MESSAGE = '请输入密码';
export const PASSWORD_RULE_MESSAGE = '当前初始密码为手机号后6位';

export function validatePhoneFormat(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return PHONE_EMPTY_MESSAGE;
  if (!PHONE_PATTERN.test(trimmed)) return PHONE_FORMAT_MESSAGE;
  return null;
}

export function validatePasswordFormat(password: string): string | null {
  if (!password) return PASSWORD_EMPTY_MESSAGE;
  if (!PASSWORD_PATTERN.test(password)) return PASSWORD_RULE_MESSAGE;
  return null;
}

export function validateCredentialRule(
  credentials: AccountCredentials,
): string | null {
  const phone = credentials.phone.trim();
  const password = credentials.password;
  if (!PHONE_PATTERN.test(phone) || !PASSWORD_PATTERN.test(password)) {
    return null;
  }
  if (password !== phone.slice(-PASSWORD_LENGTH)) return PASSWORD_RULE_MESSAGE;
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
  } else {
    const ruleError = validateCredentialRule(credentials);
    if (ruleError) errors.password = ruleError;
  }

  return errors;
}

export function isLocalCredentialFormatValid(
  credentials: AccountCredentials,
): boolean {
  return Object.keys(validateAccountForm(credentials)).length === 0;
}
