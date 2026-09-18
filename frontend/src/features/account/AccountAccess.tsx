import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import AccountLoginView from './AccountLoginView';
import AccountWechatView from './AccountWechatView';
import {
  activateAccountSession,
  getCurrentAccountIdentity,
  loginWithPhonePassword,
} from './authAccount';
import { isSupabaseConfigured } from '../../lib/supabase';
import type {
  AccountCredentials,
  AccountIdentity,
  AuthSessionTokens,
  LoginResult,
  PasswordLoginAttempt,
} from './accountTypes';
import './AccountAccess.css';
import './AccountAccessV2.css';

interface AccountAccessProps {
  children?: ReactNode;
  /** Guest demo enters the short starting-context interview before six cards. */
  onGuestExperienceStart?: () => void;
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
  onGuestExperienceStart,
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

    // Do not turn a missing *local* .env file into a fake account read failure.
    // Injected readers (tests or future host integrations) still retain their
    // explicit behavior; only the real default adapter gets this guest fallback.
    if (!isSupabaseConfigured && readIdentity === getCurrentAccountIdentity) {
      setMode('WELCOME');
      return () => {
        cancelled = true;
      };
    }

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
    onGuestExperienceStart?.();
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
        <div className="account-access__frame">
          <section
            className={`account-access__dialog${
              mode === 'LOGIN' ? ' account-access__dialog--login' : ''
            }${
              mode === 'WECHAT' ? ' account-access__dialog--wechat' : ''
            }${
              mode === 'WELCOME' ? ' account-access__dialog--welcome' : ''
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
                <span className="account-access__tab-title">人工开通</span>
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
                <span className="account-access__tab-title">游客体验</span>
                <span className="account-access__tab-copy">先确定起点，再体验 6 题</span>
              </button>
            </nav>
          )}

          {mode === 'WELCOME' && (
            <div className="account-access__welcome">
              <div className="account-access__welcome-copy">
                <div className="account-access__brand" aria-label="Exam OS">
                  <span className="account-access__brand-mark" aria-hidden="true">考</span>
                  <span>
                    <strong>Exam OS</strong>
                    <small>应试英语学习操作系统</small>
                  </span>
                </div>
                <p className="account-access__eyebrow">EXAM ENGLISH · LEARNING PATH</p>
                <h1>
                  <span>以真题为舟，</span>
                  <span>渡向更大的世界。</span>
                </h1>
                <p className="account-access__promise">
                  以理解为桨，从四级、六级到雅思、托福，走清每一段英语应试之路。
                </p>
              </div>

              <section className="account-access__guest-panel" aria-labelledby="guest-experience-title">
                <div className="account-access__guest-heading">
                  <div>
                    <p className="account-access__guest-kicker">游客体验</p>
                    <h2 id="guest-experience-title">无需注册，先确定学习起点</h2>
                  </div>
                  <span className="account-access__guest-count">6</span>
                </div>
                <div className="account-access__guest-lesson">
                  <span>当前开放</span>
                  <strong>真题阅读与句法</strong>
                  <p>先回答几个问题，再进入 6 道真实语境任务</p>
                </div>
                <button
                  type="button"
                  className="account-access__primary"
                  onClick={enterGuestExperience}
                >
                  开始体验 <span aria-hidden="true">→</span>
                </button>
                <p className="account-access__guest-note">
                  起点回答与游客进度仅保存在本机；真实能力线索来自作答过程。
                </p>
              </section>
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

          <aside className="account-access__visual" aria-hidden="true">
            <div className="account-access__visual-rail account-access__visual-rail--top">TURN → ANSWER</div>
            <div className="account-access__visual-kicker">EXAM OS · ENGLISH ASCENSION</div>
            <div className="account-access__visual-orbit">
              <div className="account-access__visual-orbit-ring" />
              <div className="account-access__visual-orbit-ring account-access__visual-orbit-ring--inner" />
              <div className="account-access__visual-mark">
                <span>修</span>
                <small>PASSPORT</small>
              </div>
            </div>
            <div className="account-access__visual-rule" />
            <div className="account-access__visual-copy">
              <h2>转折一响 · 真答案登场</h2>
              <p>旧信息退位 · 新答案登基</p>
            </div>
            <div className="account-access__visual-rail account-access__visual-rail--side">READ · UNDERSTAND · RETRIEVE</div>
          </aside>
        </div>
      </main>
    </>
  );
}
