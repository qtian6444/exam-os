import { describe, expect, it } from 'vitest';
import {
  isLocalCredentialFormatValid,
  PASSWORD_EMPTY_MESSAGE,
  PASSWORD_LENGTH_MESSAGE,
  PHONE_EMPTY_MESSAGE,
  PHONE_FORMAT_MESSAGE,
  validateAccountForm,
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

  it('accepts any password content within the supported length', () => {
    expect(validatePasswordFormat('')).toBe(PASSWORD_EMPTY_MESSAGE);
    expect(validatePasswordFormat('short')).toBe(PASSWORD_LENGTH_MESSAGE);
    expect(validatePasswordFormat('a'.repeat(73))).toBe(PASSWORD_LENGTH_MESSAGE);
    expect(validatePasswordFormat('Correct-Horse_2026!')).toBeNull();
    expect(validatePasswordFormat('安全密码-2026')).toBeNull();
    expect(
      isLocalCredentialFormatValid({
        phone: '13812345678',
        password: 'Correct-Horse_2026!',
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
