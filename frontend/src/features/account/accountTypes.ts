export interface AccountCredentials {
  phone: string;
  password: string;
}

export interface AuthSessionTokens {
  access_token: string;
  refresh_token: string;
}

export type LoginResult =
  | 'SUCCESS'
  | 'INVALID_CREDENTIALS'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR';

export type LoginFailure = Exclude<LoginResult, 'SUCCESS'>;

export type PasswordLoginAttempt =
  | { result: 'SUCCESS'; session: AuthSessionTokens }
  | { result: LoginFailure };

export type LoginUiStatus =
  | 'IDLE'
  | 'VALIDATING'
  | 'SUBMITTING'
  | 'ERROR'
  | 'SUCCESS_CALLBACK_RETURNED';

export type AccountIdentity = 'ANONYMOUS' | 'PERMANENT';
