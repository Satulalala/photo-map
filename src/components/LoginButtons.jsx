import { useState, useCallback } from 'react';
import { login as authLogin, register as authRegister } from '../api/auth.js';
import '../styles/components/login-buttons.css';

// 表单验证
const validateEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePassword = password => {
  if (password.length < 6) return '密码至少 6 个字符';
  return '';
};

// 获取用户名首字母（用于头像显示）
const getInitial = user => {
  if (!user) return '?';
  if (user.type === 'github') return (user.username || 'G')[0].toUpperCase();
  return (user.email || 'U')[0].toUpperCase();
};

// Spinner 组件
const Spinner = () => (
  <span className="login-spinner" />
);

const LoginButtons = ({ onLogin, onSkip, onLogout, isLoggedIn, showButtons, user }) => {
  // 邮箱表单状态
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailMode, setEmailMode] = useState('login'); // login | register | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // GitHub OAuth 状态
  const [githubLoading, setGithubLoading] = useState(false);

  // 重置表单
  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError('');
    setSuccessMsg('');
  }, []);

  // 打开邮箱弹窗
  const openEmailModal = (mode = 'login') => {
    resetForm();
    setEmailMode(mode);
    setShowEmailModal(true);
  };

  // 关闭邮箱弹窗
  const closeEmailModal = () => {
    setShowEmailModal(false);
    resetForm();
  };

  // 邮箱登录/注册提交
  const handleEmailSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // 验证邮箱
    if (!email) {
      setError('请输入邮箱地址');
      return;
    }
    if (!validateEmail(email)) {
      setError('邮箱格式不正确');
      return;
    }

    // 验证密码
    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    // 注册时验证确认密码
    if (emailMode === 'register' && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      const user = emailMode === 'register'
        ? await authRegister(email, password)
        : await authLogin(email, password);
      onLogin({ type: 'email', email: user.email, username: user.username, id: user.id });
      closeEmailModal();
    } catch (err) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 忘记密码提交
  const handleForgotSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email) {
      setError('请输入邮箱地址');
      return;
    }
    if (!validateEmail(email)) {
      setError('邮箱格式不正确');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccessMsg(`重置链接已发送至 ${email}，请查收邮件`);
    }, 1000);
  };

  // GitHub OAuth 登录
  const handleGithubLogin = () => {
    setGithubLoading(true);
    // 模拟 OAuth 跳转 → 回调流程
    setTimeout(() => {
      setGithubLoading(false);
      onLogin({ type: 'github', username: 'github_user' });
    }, 2000);
  };

  // 已登录：显示用户头像 + 退出按钮
  if (isLoggedIn) {
    const initial = getInitial(user);
    const displayName = user?.type === 'github' ? user.username : user?.email;
    return (
      <div className="logged-in-bar">
        <div className="user-avatar" title={displayName}>{initial}</div>
        <button className="logout-btn" onClick={onLogout}>
          <span className="logout-text">退出</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* 主登录按钮组 */}
      {showButtons && (
        <div className="login-buttons-container">
          <button
            className="login-drop-btn primary"
            onClick={() => openEmailModal('login')}
            disabled={loading || githubLoading}
          >
            <span className="btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 4L12 13L2 4" />
              </svg>
            </span>
            <span className="btn-text">邮箱登录</span>
          </button>

          <button
            className="login-drop-btn secondary"
            onClick={handleGithubLogin}
            disabled={loading || githubLoading}
          >
            <span className="btn-icon">
              {githubLoading ? <Spinner /> : (
                <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
              )}
            </span>
            <span className="btn-text">
              {githubLoading ? '正在跳转...' : 'GitHub 登录'}
            </span>
          </button>

          <button
            className="login-drop-btn tertiary"
            onClick={onSkip}
            disabled={loading || githubLoading}
          >
            <span className="btn-icon">&rarr;</span>
            <span className="btn-text">暂不登录</span>
          </button>
        </div>
      )}

      {/* GitHub OAuth 过渡动画 */}
      {githubLoading && (
        <div className="github-oauth-overlay">
          <div className="github-oauth-modal">
            <div className="github-oauth-icon">
              <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </div>
            <p className="github-oauth-text">正在跳转到 GitHub 授权...</p>
            <div className="github-oauth-dots">
              <span /><span /><span />
            </div>
          </div>
        </div>
      )}

      {/* 邮箱登录/注册/忘记密码弹窗 */}
      {showEmailModal && (
        <div className="email-form-overlay" onClick={closeEmailModal} onKeyDown={e => e.key === 'Escape' && closeEmailModal()} role="dialog" aria-modal="true" tabIndex={-1}>
          <div className="email-form-modal" onClick={e => e.stopPropagation()}>
            {/* 顶部 Tab 切换 */}
            <div className="email-form-tabs">
              <button
                className={`tab-btn ${emailMode === 'login' ? 'active' : ''}`}
                onClick={() => { setEmailMode('login'); setError(''); setSuccessMsg(''); }}
              >
                登录
              </button>
              <button
                className={`tab-btn ${emailMode === 'register' ? 'active' : ''}`}
                onClick={() => { setEmailMode('register'); setError(''); setSuccessMsg(''); }}
              >
                注册
              </button>
              <button className="close-btn" onClick={closeEmailModal}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 错误/成功提示 */}
            {error && <div className="form-message error">{error}</div>}
            {successMsg && <div className="form-message success">{successMsg}</div>}

            {/* 忘记密码视图 */}
            {emailMode === 'forgot' ? (
              <form onSubmit={handleForgotSubmit} className="email-form">
                <p className="form-hint">输入您的邮箱地址，我们将发送密码重置链接</p>
                <div className="form-field">
                  <label htmlFor="forgot-email">邮箱地址</label>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <button type="submit" className="form-submit-btn" disabled={loading}>
                  {loading ? <><Spinner /> 发送中...</> : '发送重置链接'}
                </button>
                <button
                  type="button"
                  className="form-link-btn"
                  onClick={() => { setEmailMode('login'); setError(''); setSuccessMsg(''); }}
                >
                  返回登录
                </button>
              </form>
            ) : (
              /* 登录/注册表单 */
              <form onSubmit={handleEmailSubmit} className="email-form">
                <div className="form-field">
                  <label htmlFor="login-email">邮箱地址</label>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="login-password">密码</label>
                  <div className="password-input-wrapper">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={emailMode === 'register' ? '至少 6 个字符' : '输入密码'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                          <path d="M1 1l22 22" />
                          <path d="M14.12 14.12A3 3 0 019.88 9.88" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {emailMode === 'register' && (
                  <div className="form-field">
                    <label htmlFor="login-confirm-password">确认密码</label>
                    <input
                      id="login-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="再次输入密码"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                )}

                <button type="submit" className="form-submit-btn" disabled={loading}>
                  {loading ? (
                    <><Spinner /> {emailMode === 'login' ? '登录中...' : '注册中...'}</>
                  ) : (
                    emailMode === 'login' ? '登录' : '注册'
                  )}
                </button>

                {emailMode === 'login' && (
                  <button
                    type="button"
                    className="form-link-btn"
                    onClick={() => { setEmailMode('forgot'); setError(''); setSuccessMsg(''); }}
                  >
                    忘记密码？
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default LoginButtons;
