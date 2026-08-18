import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureAnonymousSession } from './lib/supabase'

const rootEl = document.getElementById('root')!

async function bootstrap(): Promise<void> {
  try {
    await ensureAnonymousSession()
  } catch (err) {
    // Auth failure must be a clear error/retry state, never a silent fallback
    // to unauthenticated (device-id based) writes.
    console.error('[Auth] Anonymous sign-in failed:', err)
    renderAuthError()
    return
  }

  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

function renderAuthError(): void {
  rootEl.innerHTML = ''
  const el = document.createElement('div')
  el.className = 'auth-error'
  el.innerHTML = `
    <p>无法建立安全会话，请检查网络后重试。</p>
    <button id="auth-retry">重试</button>
  `
  rootEl.appendChild(el)
  document.getElementById('auth-retry')?.addEventListener('click', () => {
    el.innerHTML = '<p>正在重试…</p>'
    bootstrap()
  })
}

bootstrap()
