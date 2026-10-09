import { useState, useRef } from 'react';
import { login, register } from '../api/auth.js';
import MapIcon from './map/MapIcon.jsx';
import { useDialogFocus } from '../hooks/useDialogFocus.js';

const githubPath =
  'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z';

export default function LoginButtons({ onLogin, onSkip, onLogout, isLoggedIn, showButtons, user }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const close = () => {
    if (pending.current) return;
    setOpen(false);
    setPassword('');
    setConfirmation('');
    setError('');
  };
  useDialogFocus(open, '.email-form-overlay', close);
  const changeMode = value => {
    setMode(value);
    setError('');
    setPassword('');
    setConfirmation('');
  };
  const submit = async event => {
    event.preventDefault();
    if (pending.current) return;
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('请输入有效邮箱地址');
      return;
    }
    if (password.length < 6) {
      setError('密码至少 6 个字符');
      return;
    }
    if (mode === 'register' && confirmation !== password) {
      setError('两次输入的密码不一致');
      return;
    }
    pending.current = true;
    setLoading(true);
    try {
      const account = await (mode === 'register' ? register : login)(email.trim(), password);
      onLogin({ type: 'email', email: account.email, username: account.username, id: account.id });
      pending.current = false;
      close();
    } catch (failure) {
      setError(failure.message || '操作失败，请重试');
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };
  if (isLoggedIn)
    return (
      <div className="logged-in-bar">
        <div className="user-avatar" title={user?.username || user?.email}>
          {user ? (user.username || user.email || 'U')[0].toUpperCase() : <MapIcon name="user" />}
        </div>
        <span className="logged-in-name" title={user?.username || user?.email || '游客模式'}>
          {user?.username || user?.email || '游客模式'}
        </span>
        <button type="button" className="logout-btn" onClick={onLogout}>
          <MapIcon name="logout" />
          <span className="logout-text">退出</span>
        </button>
      </div>
    );
  return (
    <>
      {showButtons && (
        <div className="login-buttons-container">
          <button
            type="button"
            className="login-drop-btn primary"
            onClick={() => {
              changeMode('login');
              setOpen(true);
            }}
          >
            <MapIcon name="mail" />
            <span>邮箱登录</span>
          </button>
          <button type="button" className="login-drop-btn tertiary" onClick={onSkip}>
            <MapIcon name="arrow" />
            <span>暂不登录</span>
          </button>
          <button
            type="button"
            className="login-drop-btn secondary"
            disabled
            title="GitHub 授权尚未接入"
            aria-label="GitHub 登录，尚未接入"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path d={githubPath} />
            </svg>
            <span>GitHub 登录</span>
            <small>未接入</small>
          </button>
        </div>
      )}
      {open && (
        <div
          className="email-form-overlay"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={mode === 'register' ? '邮箱注册' : '邮箱登录'}
          aria-busy={loading}
          tabIndex={-1}
        >
          <div className="email-form-modal" onClick={event => event.stopPropagation()}>
            <div className="email-form-tabs">
              <button
                type="button"
                className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
                aria-pressed={mode === 'login'}
                disabled={loading}
                onClick={() => changeMode('login')}
              >
                登录
              </button>
              <button
                type="button"
                className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
                aria-pressed={mode === 'register'}
                disabled={loading}
                onClick={() => changeMode('register')}
              >
                注册
              </button>
              <button
                type="button"
                className="close-btn"
                aria-label="关闭登录窗口"
                disabled={loading}
                onClick={close}
              >
                <MapIcon name="close" />
              </button>
            </div>
            <form className="email-form" onSubmit={submit}>
              {error && (
                <p className="form-message error" role="alert">
                  {error}
                </p>
              )}
              <div className="form-field">
                <label htmlFor="login-email">邮箱地址</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="your@email.com"
                  disabled={loading}
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="login-password">密码</label>
                <div className="password-input-wrapper">
                  <input
                    id="login-password"
                    type={visiblePassword ? 'text' : 'password'}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    minLength={6}
                    required
                    disabled={loading}
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-pressed={visiblePassword}
                    aria-label={visiblePassword ? '隐藏密码' : '显示密码'}
                    disabled={loading}
                    onClick={() => setVisiblePassword(value => !value)}
                  >
                    {visiblePassword ? '隐藏' : '显示'}
                  </button>
                </div>
              </div>
              {mode === 'register' && (
                <div className="form-field">
                  <label htmlFor="login-confirm-password">确认密码</label>
                  <input
                    id="login-confirm-password"
                    type={visiblePassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    disabled={loading}
                    value={confirmation}
                    onChange={event => setConfirmation(event.target.value)}
                  />
                </div>
              )}
              <button type="submit" className="form-submit-btn" disabled={loading}>
                {loading && <span className="login-spinner" aria-hidden="true" />}
                {loading ? '处理中…' : mode === 'login' ? '登录' : '注册'}
              </button>
              {mode === 'login' && <p className="form-hint">密码找回功能尚未接入。</p>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
