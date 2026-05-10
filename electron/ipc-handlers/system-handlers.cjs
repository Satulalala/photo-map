// ========== 系统功能 IPC 处理器 ==========
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

module.exports = function registerSystemHandlers(ctx) {
  const { getMainWindow, log } = ctx;

  ipcMain.handle('set-titlebar-overlay', (_, options) => {
    try {
      const win = getMainWindow();
      if (win && process.platform === 'win32') {
        win.setTitleBarOverlay(options);
      }
      return true;
    } catch { return false; }
  });

  ipcMain.handle('log', (_, { level, message }) => {
    switch (level) {
      case 'error': log.error('[渲染进程]', message); break;
      case 'warn': log.warn('[渲染进程]', message); break;
      case 'info': log.info('[渲染进程]', message); break;
      default: log.debug('[渲染进程]', message);
    }
  });

  ipcMain.handle('get-log-path', () => {
    return log.transports.file.getFile().path;
  });

  ipcMain.handle('open-log-folder', () => {
    const logPath = log.transports.file.getFile().path;
    const logDir = path.dirname(logPath);
    require('electron').shell.openPath(logDir);
    return logDir;
  });

  ipcMain.handle('open-devtools', () => {
    const win = getMainWindow();
    if (win) {
      win.webContents.openDevTools({ mode: 'detach' });
      return true;
    }
    return false;
  });

  ipcMain.handle('get-recent-logs', () => {
    try {
      const logPath = log.transports.file.getFile().path;
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf-8');
        const lines = content.split('\n');
        return lines.slice(-100).join('\n');
      }
    } catch (e) {
      return '无法读取日志: ' + e.message;
    }
    return '';
  });
};
