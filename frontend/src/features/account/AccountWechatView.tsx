import { useEffect, useState } from 'react';
import './AccountWechatView.css';

interface AccountWechatViewProps {
  onLogin: () => void;
  onGuestTry: () => void;
  qrUrl?: string | null;
  displayName?: string;
  keyword?: string;
}

function configuredValue(name: string): string {
  const value = import.meta.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export default function AccountWechatView({
  onLogin,
  onGuestTry,
  qrUrl,
  displayName = configuredValue('VITE_ACCOUNT_WECHAT_NAME') || '睡个好觉',
  keyword = configuredValue('VITE_ACCOUNT_WECHAT_KEYWORD') || '开通账号',
}: AccountWechatViewProps) {
  const configuredQrUrl =
    qrUrl === undefined
      ? configuredValue('VITE_ACCOUNT_WECHAT_QR_URL') ||
        `${import.meta.env.BASE_URL}wechat-qr.jpg`
      : (qrUrl ?? '');
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [configuredQrUrl]);

  const showQrImage = Boolean(configuredQrUrl) && !imageFailed;

  return (
    <div className="account-wechat">
      <div className="account-wechat__copy">
        <p className="account-wechat__eyebrow">WECHAT ACCESS</p>
        <h1>微信人工开通永久账号</h1>
        <p className="account-wechat__intro">
          添加微信“{displayName}”，发送用于登录的手机号。确认后会为你开通长期学习账号。
        </p>

        <ol className="account-wechat__steps">
          <li>
            <span>1</span>
            <div>
              <strong>扫码添加微信</strong>
              <p>微信昵称：{displayName}</p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>发送“{keyword} + 手机号”</strong>
              <p>手机号将作为你的永久账号</p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>收到确认后返回登录</strong>
              <p>登录后开始积累长期学习记忆</p>
            </div>
          </li>
        </ol>

        <p className="account-wechat__privacy">
          只需发送手机号，请勿发送密码、验证码或其他敏感信息。
        </p>

        <div className="account-wechat__actions">
          <button type="button" onClick={onLogin}>
            我已有账号，返回登录
          </button>
          <button type="button" onClick={onGuestTry}>
            先以游客身份体验
          </button>
        </div>
      </div>

      <div className="account-wechat__qr-card">
        {showQrImage ? (
          <img
            src={configuredQrUrl}
            alt={`添加微信${displayName}的二维码`}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className="account-wechat__qr-placeholder"
            role="img"
            aria-label="微信二维码待配置"
          >
            <span aria-hidden="true">微</span>
            <strong>微信二维码待配置</strong>
            <p>添加原始二维码后将在这里显示</p>
          </div>
        )}
        <strong>扫码添加微信</strong>
        <p>添加后发送“{keyword} + 手机号”</p>
      </div>
    </div>
  );
}
