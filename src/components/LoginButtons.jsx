import { useState } from 'react';
import '../styles/components/login-buttons.css';

const LoginButtons = ({ onLogin, onSkip, onLogout, isLoggedIn, onEnterMap, showButtons }) => {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailClick = () => {
    setShowEmailForm(true);
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('请输入邮箱和密码');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin({ type: 'email', email });
      setShowEmailForm(false);
    }, 1000);
  };

  const handleGithubLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin({ type: 'github', username: 'github_user' });
    }, 1000);
  };

  const handleSkipLogin = () => {
    onSkip();
  };

  // 已登录：只显示退出按钮，进入地图由进度条控制
  if (isLoggedIn) {
    return (
      <button className="logout-btn" onClick={onLogout}>
        <span className="logout-icon">👤</span>
        <span className="logout-text">退出</span>
      </button>
    );
  }

  // 未登录：显示三个登录按钮（进入地图由 MinimalLoader 进度条控制，禁用状态）
  return (
    <>
      {showButtons && (
        <div className="login-buttons-container">
          <button
            className="login-drop-btn primary"
            onClick={handleEmailClick}
            disabled={loading}
          >
            <span className="btn-icon">📧</span>
            <span className="btn-text">邮箱登录</span>
          </button>

          <button
            className="login-drop-btn secondary"
            onClick={handleGithubLogin}
            disabled={loading}
          >
            <span className="btn-icon">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
            </span>
            <span className="btn-text">
              {loading ? '登录中...' : 'GitHub 登录'}
            </span>
          </button>

          <button
            className="login-drop-btn tertiary"
            onClick={handleSkipLogin}
            disabled={loading}
          >
            <span className="btn-icon">→</span>
            <span className="btn-text">暂不登录</span>
          </button>
        </div>
      )}

      {showEmailForm && (
        <div className="email-form-overlay" onClick={() => setShowEmailForm(false)}>
          <div className="email-form-modal" onClick={e => e.stopPropagation()}>
            <div className="email-form-header">
              <h3>邮箱登录</h3>
              <button className="close-btn" onClick={() => setShowEmailForm(false)}>✕</button>
            </div>
            <form onSubmit={handleEmailLogin}>
              {error && <div className="form-error">{error}</div>}
              <div className="form-field">
                <label>邮箱地址</label>
                <input type="email" placeholder="your@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} disabled={loading} autoFocus />
              </div>
              <div className="form-field">
                <label>密码</label>
                <input type="password" placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} disabled={loading} />
              </div>
              <button type="submit" className="form-submit-btn" disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginButtons;
