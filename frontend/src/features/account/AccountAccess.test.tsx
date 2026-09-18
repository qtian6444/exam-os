// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

// AccountAccess tests inject identity/login dependencies. Mock the module-level
// Supabase client so the UI contract can run without deployment env variables.
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: {} })),
}));
vi.mock('../../lib/supabase', () => ({
  supabase: { auth: {} },
  isSupabaseConfigured: true,
  supabaseRuntimeConfig: { url: 'https://example.test', anonKey: 'test-key' },
}));

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import AccountAccess from './AccountAccess';

afterEach(cleanup);

async function openLogin() {
  const entry = await screen.findByRole('button', {
    name: /已有账号/,
  });
  fireEvent.click(entry);
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('手机号'), {
    target: { value: '13812345678' },
  });
  fireEvent.change(screen.getByLabelText('密码'), {
    target: { value: 'Correct-Horse_2026!' },
  });
}

describe('AccountAccess', () => {
  it('shows the guest-only training entry before rendering Learning OS for anonymous users', async () => {
    render(
      <AccountAccess readIdentity={async () => 'ANONYMOUS'}>
        <div>Learning OS content</div>
      </AccountAccess>,
    );

    expect(
      await screen.findByRole('heading', { name: '以真题为舟，渡向更大的世界。' }),
    ).toBeTruthy();
    expect(screen.getByText('真题阅读与句法')).toBeTruthy();
    expect(screen.getByRole('button', { name: /开始体验/ })).toBeTruthy();
    expect(screen.queryByText('Learning OS content')).toBeNull();
  });

  it('renders Learning OS immediately for a permanent identity', async () => {
    render(
      <AccountAccess readIdentity={async () => 'PERMANENT'}>
        <div>Learning OS content</div>
      </AccountAccess>,
    );

    expect(await screen.findByText('Learning OS content')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('enters the complete guest experience and keeps login available', async () => {
    render(
      <AccountAccess readIdentity={async () => 'ANONYMOUS'}>
        <div>Learning OS content</div>
      </AccountAccess>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /开始体验/ }));

    expect(screen.getByText('Learning OS content')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: '登录 / 开通永久账号' }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: '登录 / 开通永久账号' }),
    );
    expect(screen.getByRole('dialog', { name: '账号登录' })).toBeTruthy();
    expect(screen.getByText('Learning OS content')).toBeTruthy();
  });

  it('switches between guest experience, manual activation, and account login', async () => {
    render(
      <AccountAccess readIdentity={async () => 'ANONYMOUS'}>
        <div>Learning OS content</div>
      </AccountAccess>,
    );

    fireEvent.click(
      await screen.findByRole('button', {
        name: /人工开通/,
      }),
    );

    expect(
      screen.getByRole('dialog', { name: '微信人工开通' }),
    ).toBeTruthy();
    expect(screen.getByText('微信人工开通永久账号')).toBeTruthy();
    expect(
      screen.getByRole('img', { name: '添加微信睡个好觉的二维码' }),
    ).toBeTruthy();
    expect(screen.queryByText('Learning OS content')).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: '我已有账号，返回登录' }),
    );

    expect(screen.getByRole('dialog', { name: '账号登录' })).toBeTruthy();
    expect(screen.getByLabelText('手机号')).toBeTruthy();
  });

  it('reloads only after Supabase login succeeds', async () => {
    const login = vi.fn(async () => ({
      result: 'SUCCESS' as const,
      session: { access_token: 'jwt', refresh_token: 'refresh' },
    }));
    const activateSession = vi.fn(async () => 'SUCCESS' as const);
    const reloadPage = vi.fn();
    render(
      <AccountAccess
        readIdentity={async () => 'ANONYMOUS'}
        login={login}
        activateSession={activateSession}
        reloadPage={reloadPage}
      />,
    );
    await openLogin();
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));
    expect(activateSession).toHaveBeenCalledWith({
      access_token: 'jwt',
      refresh_token: 'refresh',
    });
  });

  it('keeps the anonymous session active after a failed login', async () => {
    const reloadPage = vi.fn();
    const activateSession = vi.fn(async () => 'SUCCESS' as const);
    render(
      <AccountAccess
        readIdentity={async () => 'ANONYMOUS'}
        login={async () => ({ result: 'INVALID_CREDENTIALS' })}
        activateSession={activateSession}
        reloadPage={reloadPage}
      />,
    );
    await openLogin();
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    await screen.findByText('账号或密码不正确');
    expect(reloadPage).not.toHaveBeenCalled();
    expect(activateSession).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: '账号登录' })).toBeTruthy();
  });

  it('blocks Learning OS on identity read failure and supports retry', async () => {
    let attempt = 0;
    const readIdentity = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('network');
      return 'ANONYMOUS' as const;
    });

    render(
      <AccountAccess
        readIdentity={readIdentity}
      >
        <div>Learning OS content</div>
      </AccountAccess>,
    );

    expect(await screen.findByText('暂时无法读取账号状态')).toBeTruthy();
    expect(screen.queryByText('Learning OS content')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));

    expect(
      await screen.findByRole('heading', { name: '以真题为舟，渡向更大的世界。' }),
    ).toBeTruthy();
    expect(readIdentity).toHaveBeenCalledTimes(2);
  });

  it('returns to guest experience from login without changing identity', async () => {
    render(
      <AccountAccess readIdentity={async () => 'ANONYMOUS'}>
        <div>Learning OS content</div>
      </AccountAccess>,
    );
    await openLogin();

    fireEvent.click(
      screen.getByRole('button', { name: '先以游客身份体验' }),
    );

    expect(screen.queryByRole('dialog', { name: '账号登录' })).toBeNull();
    expect(screen.getByText('Learning OS content')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: '登录 / 开通永久账号' }),
    ).toBeTruthy();
  });

  it('keeps the reading-and-syntax demo inside the guest entry only', async () => {
    render(
      <AccountAccess readIdentity={async () => 'ANONYMOUS'}>
        <div>Learning OS content</div>
      </AccountAccess>,
    );

    expect(await screen.findByText('真题阅读与句法')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /已有账号/ }));

    expect(screen.getByRole('dialog', { name: '账号登录' })).toBeTruthy();
    expect(screen.queryByText('真题阅读与句法')).toBeNull();
  });
});
