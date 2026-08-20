// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  const entry = await screen.findByRole('button', { name: '账号登录' });
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
  it('shows the account entry only for user.is_anonymous identities', async () => {
    const anonymousView = render(
      <AccountAccess readIdentity={async () => 'ANONYMOUS'} />,
    );
    expect(
      await screen.findByRole('button', { name: '账号登录' }),
    ).toBeTruthy();

    anonymousView.unmount();
    render(<AccountAccess readIdentity={async () => 'PERMANENT'} />);
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: '账号登录' }),
      ).toBeNull(),
    );
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

  it('invalidates a delayed login when the dialog closes', async () => {
    let resolveLogin!: (result: {
      result: 'SUCCESS';
      session: { access_token: string; refresh_token: string };
    }) => void;
    const login = vi.fn(
      () =>
        new Promise<{
          result: 'SUCCESS';
          session: { access_token: string; refresh_token: string };
        }>((resolve) => {
          resolveLogin = resolve;
        }),
    );
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
    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '关闭账号登录' }));
    resolveLogin({
      result: 'SUCCESS',
      session: { access_token: 'late-jwt', refresh_token: 'late-refresh' },
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(activateSession).not.toHaveBeenCalled();
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('returns to the existing guest experience without changing identity', async () => {
    render(<AccountAccess readIdentity={async () => 'ANONYMOUS'} />);
    await openLogin();

    fireEvent.click(screen.getByRole('button', { name: '继续游客体验' }));

    expect(screen.queryByRole('dialog', { name: '账号登录' })).toBeNull();
    expect(screen.getByRole('button', { name: '账号登录' })).toBeTruthy();
  });
});
