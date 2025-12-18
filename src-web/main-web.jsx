import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../src/App.jsx';
import DownloadApp from './DownloadApp.jsx';
import WebAdapter from './WebAdapter.js';
import '../src/index.css';
import './web-styles.css';

// 初始化 Web 适配器
new WebAdapter();

// Web 版本的 App 组件包装器
function WebApp() {
  return (
    <div className="web-app">
      {/* 主应用 */}
      <App />
      
      {/* 下载桌面版按钮 */}
      <DownloadApp />
      
      {/* Web 版本提示 */}
      <div className="web-notice">
        <div className="web-notice-content">
          <span>🌐 这是 Web 体验版</span>
          <span>下载桌面版获得完整功能</span>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WebApp />
  </React.StrictMode>
);