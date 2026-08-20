import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { validateAccountForm } from './accountValidation';
import type { FieldErrors } from './accountValidation';
import type {
  AccountCredentials,
  LoginFailure,
  LoginResult,
  LoginUiStatus,
} from './accountTypes';
import './AccountLoginView.css';

interface AccountLoginViewProps {
  onLogin: (credentials: AccountCredentials) => Promise<LoginResult>;
  onGuestTry?: () => void;
}

function messageForLoginFailure(result: LoginFailure): string {
  switch (result) {
    case 'INVALID_CREDENTIALS':
      return '账号或密码不正确';
    case 'NETWORK_ERROR':
      return '网络连接失败，请稍后重试';
    case 'RATE_LIMITED':
      return '请求过于频繁，请稍后再试';
    case 'UNKNOWN_ERROR':
      return '登录失败，请稍后重试';
  }
}

export default function AccountLoginView({
  onLogin,
  onGuestTry,
}: AccountLoginViewProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<LoginUiStatus>('IDLE');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const submittingRef = useRef(false);

  const isBusy = status === 'VALIDATING' || status === 'SUBMITTING';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    setSubmitError(null);
    setStatus('VALIDATING');
    const errors = validateAccountForm({ phone, password });
    if (errors.phone || errors.password) {
      setFieldErrors(errors);
      setStatus('ERROR');
      return;
    }
    setFieldErrors({});

    submittingRef.current = true;
    setStatus('SUBMITTING');
    try {
      const result = await onLogin({ phone: phone.trim(), password });
      if (result === 'SUCCESS') {
        setStatus('SUCCESS_CALLBACK_RETURNED');
      } else {
        setSubmitError(messageForLoginFailure(result));
        setStatus('ERROR');
      }
    } catch {
      setSubmitError('登录失败，请稍后重试');
      setStatus('ERROR');
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <div className="account-login">
      <header className="account-login__header">
        <h1 className="account-login__title">Exam OS</h1>
        <p className="account-login__subtitle">登录并继续你的学习状态</p>
      </header>

      <form className="account-login__form" onSubmit={handleSubmit} noValidate>
        <div className="account-login__field">
          <label className="account-login__label" htmlFor="account-login-phone">
            手机号
          </label>
          <input
            id="account-login-phone"
            className="account-login__input"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={11}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="请输入手机号"
            disabled={isBusy}
            aria-invalid={fieldErrors.phone ? true : undefined}
            aria-describedby={
              fieldErrors.phone ? 'account-login-phone-error' : undefined
            }
          />
          {fieldErrors.phone && (
            <p
              id="account-login-phone-error"
              className="account-login__field-error"
              role="alert"
            >
              {fieldErrors.phone}
            </p>
          )}
        </div>

        <div className="account-login__field">
          <label
            className="account-login__label"
            htmlFor="account-login-password"
          >
            密码
          </label>
          <div className="account-login__password-row">
            <input
              id="account-login-password"
              className="account-login__input"
              type={showPassword ? 'text' : 'password'}
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入初始密码"
              disabled={isBusy}
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby={
                fieldErrors.password ? 'account-login-password-error' : undefined
              }
            />
            <button
              type="button"
              className="account-login__toggle"
              onClick={() => setShowPassword((value) => !value)}
              disabled={isBusy}
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
            >
              {showPassword ? '隐藏' : '显示'}
            </button>
          </div>
          {fieldErrors.password && (
            <p
              id="account-login-password-error"
              className="account-login__field-error"
              role="alert"
            >
              {fieldErrors.password}
            </p>
          )}
        </div>

        {submitError && (
          <p className="account-login__submit-error" role="alert">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          className="account-login__submit"
          disabled={isBusy}
        >
          {status === 'SUBMITTING' ? '登录中…' : '登录'}
        </button>
      </form>

      {onGuestTry && (
        <button
          type="button"
          className="account-login__guest"
          onClick={onGuestTry}
          disabled={isBusy}
        >
          继续游客体验
        </button>
      )}
    </div>
  );
}
