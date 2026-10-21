import { useState, useRef, useEffect } from 'react';
import {
  login,
  register,
  requestPasswordReset,
  resetPassword,
  getAuthProviders,
  getSessionUser,
  githubLoginUrl,
} from '../api/auth.js';
import MapIcon from './map/MapIcon.jsx';
import LoginActionStack, { githubPath } from './LoginActionStack.jsx';
import { useDialogFocus } from '../hooks/useDialogFocus.js';

export default function LoginButtons({
  onLogin,
  onSkip,
  onLogout,
  isLoggedIn,
  showButtons,
  landingLayout = false,
  user,
}) {
  const [initialResetToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.hash.slice(1)).get('reset_password') || '';
  });
  const [resetToken, setResetToken] = useState(initialResetToken);
  const [open, setOpen] = useState(Boolean(initialResetToken));
  const [mode, setMode] = useState(initialResetToken ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authProviders, setAuthProviders] = useState(null);
  const pending = useRef(false);
  const close = () => {
    if (pending.current) return;
    setOpen(false);
    setPassword('');
    setConfirmation('');
    setError('');
  };
  useDialogFocus(open, '.email-form-overlay', close);
  useEffect(() => {
    let active = true;
    getAuthProviders()
      .then(providers => {
        if (active) setAuthProviders(providers);
      })
      .catch(() => {
        if (active) setAuthProviders({ github: false, passwordRecovery: false });
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!initialResetToken) return;
    const url = new URL(window.location.href);
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  }, [initialResetToken]);
  useEffect(() => {
    const url = new URL(window.location.href);
    const authStatus = url.searchParams.get('auth');
    if (!authStatus) return;
    const reason = url.searchParams.get('auth_reason');
    url.searchParams.delete('auth');
    url.searchParams.delete('auth_reason');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);

    if (authStatus === 'github-success') {
      setLoading(true);
      getSessionUser()
        .then(account => {
          onLogin({ ...account, type: 'github' });
          setOpen(false);
        })
        .catch(() => {
          setOpen(true);
          setError('GitHub 登录状态未能确认，请重新登录。');
        })
        .finally(() => setLoading(false));
      return;
    }

    const messages = {
      unavailable: 'GitHub 登录暂未配置，请联系管理员。',
      throttled: '操作过于频繁，请稍后重试。',
      cancelled: '你已取消 GitHub 授权。',
      account_conflict: '此 GitHub 账号无法关联，请使用原账号登录。',
    };
    setOpen(true);
    setError(messages[reason] || 'GitHub 登录未完成，请重试。');
  }, [onLogin]);

  const changeMode = value => {
    setMode(value);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmation('');
  };
  const submit = async event => {
    event.preventDefault();
    if (pending.current) return;
    setError('');
    setSuccess('');
    if (
      mode !== 'reset' &&
      (email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    ) {
      setError('请输入有效邮箱地址');
      return;
    }
    if (mode === 'login' || mode === 'register' || mode === 'reset') {
      if (password.length < 6) {
        setError('密码至少 6 个字符');
        return;
      }
      if (password.length > 128) {
        setError('密码不能超过 128 个字符');
        return;
      }
    }
    if ((mode === 'register' || mode === 'reset') && confirmation !== password) {
      setError('两次输入的密码不一致');
      return;
    }
    pending.current = true;
    setLoading(true);
    try {
      if (mode === 'forgot') {
        const message = await requestPasswordReset(email.trim().toLowerCase());
        setSuccess(message || '如果该邮箱已注册，我们会发送密码重置邮件，请查收。');
        return;
      }
      if (mode === 'reset') {
        const message = await resetPassword(resetToken, password);
        setSuccess(message || '密码已重置，请使用新密码登录。');
        setResetToken('');
        setPassword('');
        setConfirmation('');
        setMode('login');
        if (isLoggedIn) onLogout('密码已重置，请使用新密码重新登录');
        return;
      }

      const account = await (mode === 'register' ? register : login)(email.trim().toLowerCase(), password);
      onLogin({ type: account.type || 'email', email: account.email, username: account.username, id: account.id });
      pending.current = false;
      close();
    } catch (failure) {
      setError(failure.message || '操作失败，请重试');
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };
  const startGitHubLogin = () => {
    const returnTo = window.location.protocol === 'photomap:'
      ? 'photomap://app/index.html'
      : window.location.origin;
    window.location.assign(githubLoginUrl(returnTo));
  };
  const openEmailLogin = () => {
    changeMode('login');
    setOpen(true);
  };
  if (isLoggedIn && !resetToken)
    return (
      <div className="logged-in-bar">
        <div className="user-avatar" title={user?.username || user?.email}>
          {user ? (user.username || user.email || 'U')[0].toUpperCase() : <MapIcon name="user" />}
        </div>
        <span className="logged-in-name" title={user?.username || user?.email || '游客模式'}>
          {user?.username || user?.email || '游客模式'}
        </span>
        <button type="button" className="logout-btn" onClick={() => onLogout()}>
          <MapIcon name="logout" />
          <span className="logout-text">退出</span>
        </button>
      </div>
    );
  return (
    <>
      {showButtons && (
        landingLayout ? (
          <LoginActionStack
            authProviders={authProviders}
            onEmailLogin={openEmailLogin}
            onGithubLogin={startGitHubLogin}
            onSkip={onSkip}
          />
        ) : (
          <div className="login-buttons-container">
            <button
              type="button"
              className="login-drop-btn primary"
              onClick={openEmailLogin}
            >
              <MapIcon name="mail" />
              <span>邮箱登录</span>
            </button>
            <button
              type="button"
              className="login-drop-btn secondary"
              disabled={Boolean(authProviders && !authProviders.github)}
              title={authProviders && !authProviders.github ? 'GitHub 登录需在服务端配置 OAuth 应用' : '使用 GitHub 账号登录'}
              aria-label="GitHub 登录"
              onClick={startGitHubLogin}
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
              {authProviders && !authProviders.github && <small>未配置</small>}
            </button>
            <button type="button" className="login-drop-btn tertiary" onClick={onSkip}>
              <MapIcon name="arrow" />
              <span>暂不登录</span>
            </button>
          </div>
        )
      )}
      {open && (
        <div
          className="email-form-overlay"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={
            mode === 'register'
              ? '邮箱注册'
              : mode === 'forgot'
                ? '找回密码'
                : mode === 'reset'
                  ? '重置密码'
                  : '邮箱登录'
          }
          aria-busy={loading}
          tabIndex={-1}
        >
          <div className="email-form-modal" onClick={event => event.stopPropagation()}>
            <div className="email-form-tabs">
              {mode === 'login' || mode === 'register' ? (
                <>
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
                </>
              ) : (
                <button
                  type="button"
                  className="tab-btn active"
                  disabled={loading}
                  onClick={() => changeMode('login')}
                >
                  返回登录
                </button>
              )}
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
              {success && (
                <p className="form-message success" role="status">
                  {success}
                </p>
              )}
              {mode !== 'reset' && (
                <div className="form-field">
                  <label htmlFor="login-email">邮箱地址</label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    placeholder="your@email.com"
                    disabled={loading}
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                  />
                </div>
              )}
              {mode !== 'forgot' && (
                <div className="form-field">
                  <label htmlFor="login-password">{mode === 'login' ? '密码' : '新密码'}</label>
                  <div className="password-input-wrapper">
                    <input
                      id="login-password"
                      type={visiblePassword ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      minLength={6}
                      maxLength={128}
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
              )}
              {(mode === 'register' || mode === 'reset') && (
                <div className="form-field">
                  <label htmlFor="login-confirm-password">确认密码</label>
                  <input
                    id="login-confirm-password"
                    type={visiblePassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    maxLength={128}
                    required
                    disabled={loading}
                    value={confirmation}
                    onChange={event => setConfirmation(event.target.value)}
                  />
                </div>
              )}
              <button type="submit" className="form-submit-btn" disabled={loading}>
                {loading && <span className="login-spinner" aria-hidden="true" />}
                {loading
                  ? '处理中…'
                  : mode === 'login'
                    ? '登录'
                    : mode === 'register'
                      ? '注册'
                      : mode === 'forgot'
                        ? '发送重置邮件'
                        : '重置密码'}
              </button>
              {mode === 'login' && (
                <button
                  type="button"
                  className="form-link-btn"
                  disabled={Boolean(authProviders && !authProviders.passwordRecovery)}
                  title={
                    authProviders && !authProviders.passwordRecovery
                      ? '密码找回需要管理员配置邮件发送服务'
                      : '通过邮箱重置密码'
                  }
                  onClick={() => changeMode('forgot')}
                >
                  忘记密码？
                </button>
              )}
              {mode === 'login' && authProviders && !authProviders.passwordRecovery && (
                <p className="form-hint">密码找回暂未配置，请联系管理员。</p>
              )}
              {mode === 'forgot' && (
                <p className="form-hint">如邮箱已注册，我们会发送一封有效期为 30 分钟的重置邮件。</p>
              )}
              {mode === 'reset' && <p className="form-hint">请设置至少 6 个字符的新密码。</p>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
