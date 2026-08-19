import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureAnonymousSession, resetAnonymousSessionInit } from './lib/supabase'

const AUTH_TIMEOUT_MS = 12_000

type AuthStatus = 'loading' | 'ready' | 'error'

function Bootstrap() {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timedOut = false

    const timer = setTimeout(() => {
      timedOut = true
      if (!cancelled) setStatus('error')
    }, AUTH_TIMEOUT_MS)

    setStatus('loading')
    ensureAnonymousSession()
      .then(() => {
        if (!cancelled && !timedOut) setStatus('ready')
      })
      .catch((err) => {
        console.error('[Auth] Anonymous sign-in failed:', err)
        if (!cancelled) setStatus('error')
      })
      .finally(() => clearTimeout(timer))

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [attempt])

  if (status === 'loading') {
    return (
      <div className="auth-loading">
        <p>正在准备学习环境…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="auth-error">
        <p>无法建立安全会话，请检查网络后重试。</p>
        <button
          onClick={() => {
            // Abandon any still-in-flight attempt so its late resolution can
            // never overwrite the fresh attempt we're about to start.
            resetAnonymousSessionInit();
            setAttempt((a) => a + 1);
          }}
        >
          重试
        </button>
      </div>
    )
  }

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
)
