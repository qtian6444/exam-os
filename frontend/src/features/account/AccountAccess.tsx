import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import AccountLoginView from './AccountLoginView';
import AccountWechatView from './AccountWechatView';
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
  children?: ReactNode;
  readIdentity?: () => Promise<AccountIdentity>;
  login?: (credentials: AccountCredentials) => Promise<PasswordLoginAttempt>;
  activateSession?: (
    session: AuthSessionTokens,
  ) => Promise<LoginResult>;
  reloadPage?: () => void;
}

type AccountAccessMode =
  | 'CHECKING'
  | 'ERROR'
  | 'WELCOME'
  | 'LOGIN'
  | 'WECHAT'
  | 'GUEST'
  | 'PERMANENT';

type AccountPanelMode = Extract<
  AccountAccessMode,
  'WELCOME' | 'LOGIN' | 'WECHAT'
>;

export default function AccountAccess({
  children,
  readIdentity = getCurrentAccountIdentity,
  login = loginWithPhonePassword,
  activateSession = activateAccountSession,
  reloadPage = () => window.location.reload(),
}: AccountAccessProps) {
  const [mode, setMode] = useState<AccountAccessMode>('CHECKING');
  const [identityAttempt, setIdentityAttempt] = useState(0);
  const [hasEnteredGuest, setHasEnteredGuest] = useState(false);
  const [isLoginPending, setIsLoginPending] = useState(false);
  const activeRequestRef = useRef(0);
  const committingRequestRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    readIdentity()
      .then((value) => {
        if (!cancelled) {
          setMode(value === 'ANONYMOUS' ? 'WELCOME' : 'PERMANENT');
        }
      })
      .catch(() => {
        if (!cancelled) setMode('ERROR');
      });

    return () => {
      cancelled = true;
    };
  }, [identityAttempt, readIdentity]);

  useEffect(
    () => () => {
      activeRequestRef.current += 1;
    },
    [],
  );

  const enterGuestExperience = () => {
    if (committingRequestRef.current !== null) return;
    activeRequestRef.current += 1;
    setHasEnteredGuest(true);
    setMode('GUEST');
  };

  const retryIdentityRead = () => {
    activeRequestRef.current += 1;
    setMode('CHECKING');
    setIdentityAttempt((attempt) => attempt + 1);
  };

  const showAccountPanel = (nextMode: AccountPanelMode) => {
    if (isLoginPending || committingRequestRef.current !== null) return;
    activeRequestRef.current += 1;
    setMode(nextMode);
  };

  const handleLogin = async (
    credentials: AccountCredentials,
  ): Promise<LoginResult> => {
    const requestToken = ++activeRequestRef.current;
    setIsLoginPending(true);
    try {
      const attempt = await login(credentials);
      if (requestToken !== activeRequestRef.current) return 'UNKNOWN_ERROR';
      if (attempt.result !== 'SUCCESS') return attempt.result;

      committingRequestRef.current = requestToken;
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
        setIsLoginPending(false);
      }
    }
  };

  if (mode === 'PERMANENT') return <>{children}</>;

  if (mode === 'GUEST') {
    return (
      <>
        {children}
        <button
          type="button"
          className="account-access__entry"
          onClick={() => showAccountPanel('LOGIN')}
        >
          登录 / 开通永久账号
        </button>
      </>
    );
  }

  return (
    <>
      {hasEnteredGuest && children}
      <main className="account-access__experience">
        <section
          className={`account-access__dialog${
            mode === 'LOGIN' ? ' account-access__dialog--login' : ''
          }${
            mode === 'WECHAT' ? ' account-access__dialog--wechat' : ''
          }`}
          role="dialog"
          aria-modal="true"
          aria-label={
            mode === 'LOGIN'
              ? '账号登录'
              : mode === 'WECHAT'
                ? '微信人工开通'
                : '账号欢迎入口'
          }
        >
          {mode === 'CHECKING' && (
            <div className="account-access__status" role="status">
              <span
                className="account-access__status-mark"
                aria-hidden="true"
              />
              <p>正在确认学习身份…</p>
            </div>
          )}

          {mode === 'ERROR' && (
            <div className="account-access__status">
              <h1>暂时无法读取账号状态</h1>
              <p>请检查网络后重试。学习数据不会因此切换身份。</p>
              <button
                type="button"
                className="account-access__primary"
                onClick={retryIdentityRead}
              >
                重新读取
              </button>
            </div>
          )}

          {(mode === 'WELCOME' || mode === 'LOGIN' || mode === 'WECHAT') && (
            <nav className="account-access__tabs" aria-label="账号入口选择">
              <button
                type="button"
                className={mode === 'LOGIN' ? 'is-active' : undefined}
                onClick={() => showAccountPanel('LOGIN')}
                disabled={isLoginPending}
                aria-current={mode === 'LOGIN' ? 'page' : undefined}
              >
                <span className="account-access__tab-index">01</span>
                <span className="account-access__tab-title">已有账号</span>
                <span className="account-access__tab-copy">手机号 + 密码登录</span>
              </button>
              <button
                type="button"
                className={mode === 'WECHAT' ? 'is-active' : undefined}
                onClick={() => showAccountPanel('WECHAT')}
                disabled={isLoginPending}
                aria-current={mode === 'WECHAT' ? 'page' : undefined}
              >
                <span className="account-access__tab-index">02</span>
                <span className="account-access__tab-title">微信开通</span>
                <span className="account-access__tab-copy">人工开通永久账号</span>
              </button>
              <button
                type="button"
                className={mode === 'WELCOME' ? 'is-active' : undefined}
                onClick={() => showAccountPanel('WELCOME')}
                disabled={isLoginPending}
                aria-current={mode === 'WELCOME' ? 'page' : undefined}
              >
                <span className="account-access__tab-index">03</span>
                <span className="account-access__tab-title">先了解</span>
                <span className="account-access__tab-copy">了解长期学习记忆</span>
              </button>
            </nav>
          )}

          {mode === 'WELCOME' && (
            <div className="account-access__welcome">
              <div className="account-access__welcome-copy">
                <p className="account-access__eyebrow">
                  Exam OS · Learning OS
                </p>
                <h1>让每一次学习，都成为下一次进步的依据</h1>
                <p className="account-access__promise">
                  登录后，AI会持续理解你的英语学习状态。
                </p>
                <p className="account-access__description">
                  永久账号会持续积累你的学习记录、能力变化、薄弱点、优势项与学习习惯，形成长期学习记忆。
                </p>

                <ul className="account-access__memory-list">
                  <li>持续记录英语能力变化</li>
                  <li>识别薄弱点与优势项</li>
                  <li>为个性化学习建议积累依据</li>
                </ul>
              </div>

              <div className="account-access__choices">
                <button
                  type="button"
                  className="account-access__primary"
                  onClick={() => showAccountPanel('LOGIN')}
                >
                  登录永久账号
                </button>
                <button
                  type="button"
                  className="account-access__secondary"
                  onClick={() => showAccountPanel('WECHAT')}
                >
                  还没有账号？微信人工开通
                </button>
                <button
                  type="button"
                  className="account-access__guest-action"
                  onClick={enterGuestExperience}
                >
                  游客体验
                </button>
                <p className="account-access__guest-note">
                  游客可以体验完整学习流程，但学习数据仅作临时体验，不保证长期保存。
                </p>
              </div>
            </div>
          )}

          {mode === 'LOGIN' && (
            <AccountLoginView
              onLogin={handleLogin}
              onGuestTry={enterGuestExperience}
            />
          )}

          {mode === 'WECHAT' && (
            <AccountWechatView
              onLogin={() => showAccountPanel('LOGIN')}
              onGuestTry={enterGuestExperience}
            />
          )}
        </section>
      </main>
    </>
  );
}
