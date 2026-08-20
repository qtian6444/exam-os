import { useEffect, useRef, useState } from 'react';
import AccountLoginView from './AccountLoginView';
import {
  activateAccountSession,
  getCurrentAccountIdentity,
  loginWithPhonePassword,
} from './authAccount';
import type {
  AccountCredentials,
  AccountIdentity,
  AuthSessionTokens,
  LoginResult,
  PasswordLoginAttempt,
} from './accountTypes';
import './AccountAccess.css';

interface AccountAccessProps {
  readIdentity?: () => Promise<AccountIdentity>;
  login?: (credentials: AccountCredentials) => Promise<PasswordLoginAttempt>;
  activateSession?: (
    session: AuthSessionTokens,
  ) => Promise<LoginResult>;
  reloadPage?: () => void;
}

export default function AccountAccess({
  readIdentity = getCurrentAccountIdentity,
  login = loginWithPhonePassword,
  activateSession = activateAccountSession,
  reloadPage = () => window.location.reload(),
}: AccountAccessProps) {
  const [identity, setIdentity] = useState<AccountIdentity | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const activeRequestRef = useRef(0);
  const committingRequestRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    readIdentity()
      .then((value) => {
        if (!cancelled) setIdentity(value);
      })
      .catch(() => {
        // Identity is not inferred from phone or other profile fields. A failed
        // authoritative read keeps the optional account entry hidden.
      });

    return () => {
      cancelled = true;
    };
  }, [readIdentity]);

  useEffect(
    () => () => {
      activeRequestRef.current += 1;
    },
    [],
  );

  if (identity !== 'ANONYMOUS') return null;

  const closeDialog = () => {
    if (committingRequestRef.current !== null) return;
    activeRequestRef.current += 1;
    setIsOpen(false);
  };

  const handleLogin = async (
    credentials: AccountCredentials,
  ): Promise<LoginResult> => {
    const requestToken = ++activeRequestRef.current;
    const attempt = await login(credentials);

    if (requestToken !== activeRequestRef.current) return 'UNKNOWN_ERROR';
    if (attempt.result !== 'SUCCESS') return attempt.result;

    committingRequestRef.current = requestToken;
    setIsActivating(true);
    try {
      const result = await activateSession(attempt.session);
      if (requestToken !== activeRequestRef.current) return 'UNKNOWN_ERROR';
      if (result === 'SUCCESS') reloadPage();
      return result;
    } catch {
      return 'UNKNOWN_ERROR';
    } finally {
      if (committingRequestRef.current === requestToken) {
        committingRequestRef.current = null;
      }
      if (activeRequestRef.current === requestToken) {
        setIsActivating(false);
      }
    }
  };

  return (
    <>
      <button
        type="button"
        className="account-access__entry"
        onClick={() => setIsOpen(true)}
      >
        账号登录
      </button>

      {isOpen && (
        <div className="account-access__overlay">
          <section
            className="account-access__dialog"
            role="dialog"
            aria-modal="true"
            aria-label="账号登录"
          >
            <button
              type="button"
              className="account-access__close"
              onClick={closeDialog}
              disabled={isActivating}
              aria-label="关闭账号登录"
            >
              ×
            </button>
            <AccountLoginView
              onLogin={handleLogin}
              onGuestTry={closeDialog}
            />
          </section>
        </div>
      )}
    </>
  );
}
