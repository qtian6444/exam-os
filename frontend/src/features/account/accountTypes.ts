export interface AccountCredentials {
  phone: string;
  password: string;
}

export type LoginResult =
  | 'SUCCESS'
  | 'INVALID_CREDENTIALS'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR';

export type LoginFailure = Exclude<LoginResult, 'SUCCESS'>;

export type LoginUiStatus =
  | 'IDLE'
  | 'VALIDATING'
  | 'SUBMITTING'
  | 'ERROR'
  | 'SUCCESS_CALLBACK_RETURNED';

export type AccountIdentity = 'ANONYMOUS' | 'PERMANENT';
