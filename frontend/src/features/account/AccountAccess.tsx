import { useEffect, useState } from 'react';
import AccountLoginView from './AccountLoginView';
import {
  getCurrentAccountIdentity,
  loginWithPhonePassword,
} from './authAccount';
import type {
  AccountCredentials,
  AccountIdentity,
  LoginResult,
} from './accountTypes';
import './AccountAccess.css';

interface AccountAccessProps {
  readIdentity?: () => Promise<AccountIdentity>;
  login?: (credentials: AccountCredentials) => Promise<LoginResult>;
  reloadPage?: () => void;
}

export default function AccountAccess({
  readIdentity = getCurrentAccountIdentity,
  login = loginWithPhonePassword,
  reloadPage = () => window.location.reload(),
}: AccountAccessProps) {
  const [identity, setIdentity] = useState<AccountIdentity | null>(null);
  const [isOpen, setIsOpen] = useState(false);

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

  if (identity !== 'ANONYMOUS') return null;

  const handleLogin = async (
    credentials: AccountCredentials,
  ): Promise<LoginResult> => {
    const result = await login(credentials);
    if (result === 'SUCCESS') reloadPage();
    return result;
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
              onClick={() => setIsOpen(false)}
              aria-label="关闭账号登录"
            >
              ×
            </button>
            <AccountLoginView
              onLogin={handleLogin}
              onGuestTry={() => setIsOpen(false)}
            />
          </section>
        </div>
      )}
    </>
  );
}
