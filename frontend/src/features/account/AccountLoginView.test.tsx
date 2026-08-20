// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import AccountLoginView from './AccountLoginView';
import type { LoginResult } from './accountTypes';

afterEach(cleanup);

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('手机号'), {
    target: { value: '13812345678' },
  });
  fireEvent.change(screen.getByLabelText('密码'), {
    target: { value: 'Correct-Horse_2026!' },
  });
}

describe('AccountLoginView', () => {
  it('validates before calling the auth adapter', () => {
    const onLogin = vi.fn(async (): Promise<LoginResult> => 'SUCCESS');
    render(<AccountLoginView onLogin={onLogin} />);

    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(onLogin).not.toHaveBeenCalled();
    expect(screen.getByText('请输入手机号')).toBeTruthy();
    expect(screen.getByText('请输入密码')).toBeTruthy();
  });

  it('submits trimmed, locally valid credentials once', async () => {
    let resolveLogin!: (result: LoginResult) => void;
    const onLogin = vi.fn(
      () =>
        new Promise<LoginResult>((resolve) => {
          resolveLogin = resolve;
        }),
    );
    render(<AccountLoginView onLogin={onLogin} />);
    fillValidForm();

    const button = screen.getByRole('button', { name: '登录' });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(onLogin).toHaveBeenCalledWith({
      phone: '13812345678',
      password: 'Correct-Horse_2026!',
    });
    expect((button as HTMLButtonElement).disabled).toBe(true);

    resolveLogin('SUCCESS');
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  });

  it('shows only mapped user-facing failures', async () => {
    const onLogin = vi.fn(
      async (): Promise<LoginResult> => 'INVALID_CREDENTIALS',
    );
    render(<AccountLoginView onLogin={onLogin} />);
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() =>
      expect(screen.getByText('账号或密码不正确')).toBeTruthy(),
    );
    expect(screen.queryByText(/手机号后6位/)).toBeNull();
  });

  it('keeps the guest path available', () => {
    const onGuestTry = vi.fn();
    render(
      <AccountLoginView
        onLogin={async () => 'SUCCESS'}
        onGuestTry={onGuestTry}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '继续游客体验' }));
    expect(onGuestTry).toHaveBeenCalledTimes(1);
  });
});
