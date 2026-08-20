import { describe, expect, it } from 'vitest';
import {
  isLocalCredentialFormatValid,
  PASSWORD_EMPTY_MESSAGE,
  PASSWORD_RULE_MESSAGE,
  PHONE_EMPTY_MESSAGE,
  PHONE_FORMAT_MESSAGE,
  validateAccountForm,
  validateCredentialRule,
  validatePasswordFormat,
  validatePhoneFormat,
} from './accountValidation';

describe('account validation', () => {
  it('validates mainland mobile format', () => {
    expect(validatePhoneFormat('')).toBe(PHONE_EMPTY_MESSAGE);
    expect(validatePhoneFormat('12345')).toBe(PHONE_FORMAT_MESSAGE);
    expect(validatePhoneFormat('13812345678')).toBeNull();
    expect(validatePhoneFormat(' 13812345678 ')).toBeNull();
  });

  it('requires a six-digit password', () => {
    expect(validatePasswordFormat('')).toBe(PASSWORD_EMPTY_MESSAGE);
    expect(validatePasswordFormat('12345')).toBe(PASSWORD_RULE_MESSAGE);
    expect(validatePasswordFormat('abcdef')).toBe(PASSWORD_RULE_MESSAGE);
    expect(validatePasswordFormat('345678')).toBeNull();
  });

  it('enforces the initial password rule without claiming authentication', () => {
    expect(
      validateCredentialRule({ phone: '13812345678', password: '345678' }),
    ).toBeNull();
    expect(
      validateCredentialRule({ phone: '13812345678', password: '111111' }),
    ).toBe(PASSWORD_RULE_MESSAGE);
    expect(
      isLocalCredentialFormatValid({
        phone: '13812345678',
        password: '345678',
      }),
    ).toBe(true);
  });

  it('returns field-level errors', () => {
    expect(validateAccountForm({ phone: '', password: '' })).toEqual({
      phone: PHONE_EMPTY_MESSAGE,
      password: PASSWORD_EMPTY_MESSAGE,
    });
  });
});
