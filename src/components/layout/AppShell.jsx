import React from 'react';

/**
 * AppShell —— 应用顶层布局外壳
 * 职责：最小化的布局结构，不做任何业务逻辑
 */
const AppShell = ({ children, isLoggedIn, onLogin, onSkip, onLogout, user, showButtons }) => {
  return (
    <div className="app">
      {/* Electron 无边框窗口拖拽区域 */}
      {!window.electronAPI ? null : (
        <div className="window-drag-region" />
      )}

      {children}
    </div>
  );
};

export default AppShell;
