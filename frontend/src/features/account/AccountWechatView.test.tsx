// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import AccountWechatView from './AccountWechatView';

afterEach(cleanup);

describe('AccountWechatView', () => {
  it('uses the bundled WeChat QR and display name by default', () => {
    render(
      <AccountWechatView onLogin={vi.fn()} onGuestTry={vi.fn()} />,
    );

    const image = screen.getByRole('img', {
      name: '添加微信睡个好觉的二维码',
    }) as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('/wechat-qr.jpg');
    expect(screen.getByText('微信昵称：睡个好觉')).toBeTruthy();
  });

  it('shows safe manual activation instructions without a configured QR image', () => {
    render(
      <AccountWechatView
        onLogin={vi.fn()}
        onGuestTry={vi.fn()}
        qrUrl={null}
        displayName="学习助手"
        keyword="开通账号"
      />,
    );

    expect(screen.getByText('微信昵称：学习助手')).toBeTruthy();
    expect(screen.getByText('发送“开通账号 + 手机号”')).toBeTruthy();
    expect(screen.getByLabelText('微信二维码待配置')).toBeTruthy();
    expect(screen.getByText(/请勿发送密码、验证码/)).toBeTruthy();
  });

  it('renders a configured QR image with an accessible label', () => {
    render(
      <AccountWechatView
        onLogin={vi.fn()}
        onGuestTry={vi.fn()}
        qrUrl="/wechat-qr.png"
        displayName="学习助手"
      />,
    );

    const image = screen.getByRole('img', {
      name: '添加微信学习助手的二维码',
    }) as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('/wechat-qr.png');
  });

  it('provides explicit login and guest exits', () => {
    const onLogin = vi.fn();
    const onGuestTry = vi.fn();
    render(
      <AccountWechatView
        onLogin={onLogin}
        onGuestTry={onGuestTry}
        qrUrl={null}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: '我已有账号，返回登录' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: '先以游客身份体验' }),
    );

    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(onGuestTry).toHaveBeenCalledTimes(1);
  });
});
