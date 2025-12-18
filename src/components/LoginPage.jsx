import { memo } from 'react';

/**
 * 登录页组件
 */
const LoginPage = memo(function LoginPage({ isLoggingIn, locateProgress, onLogin }) {
  return (
    <div 
      className={`login-page ${isLoggingIn ? 'exiting' : ''}`}
      onMouseMove={(e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 30;
        const y = (e.clientY / window.innerHeight - 0.5) * 30;
        document.documentElement.style.setProperty('--mouse-x', `${x}px`);
        document.documentElement.style.setProperty('--mouse-y', `${y}px`);
      }}
    >
      <div className="login-bg">
        <div className="login-circle c1"></div>
        <div className="login-circle c2"></div>
        <div className="login-circle c3"></div>
      </div>
      <div className="login-card">
        <div className="login-icon">📍</div>
        <h1>地图相册</h1>
        <p>在地图上记录你的旅行回忆</p>
        <div className="login-progress-wrap">
          <div className="login-progress">
            <div className="login-progress-bar" style={{ width: `${locateProgress}%` }} />
          </div>
          <span className="login-progress-text">
            {locateProgress < 100 ? `定位中 ${Math.round(locateProgress)}%` : '定位完成'}
          </span>
        </div>
        <button 
          className="login-btn" 
          onClick={onLogin} 
          disabled={isLoggingIn || locateProgress < 100}
        >
          {isLoggingIn ? '进入中...' : '开始探索'}
        </button>
        <div className="login-footer">
          <span>🌍</span> 探索世界，记录美好
        </div>
      </div>
    </div>
  );
});

export default LoginPage;
