/**
 * 自动更新模块
 * 
 * 使用 electron-updater 实现应用自动更新
 * 支持 GitHub Releases 作为更新源
 */

const { autoUpdater } = require('electron-updater');
const { app, dialog, BrowserWindow, ipcMain } = require('electron');
const log = require('electron-log');

// 配置日志
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// 更新配置
autoUpdater.autoDownload = false; // 不自动下载，让用户确认
autoUpdater.autoInstallOnAppQuit = true; // 退出时自动安装

/**
 * 初始化自动更新
 * @param {BrowserWindow} mainWindow - 主窗口
 */
function initAutoUpdater(mainWindow) {
  // 检查更新出错
  autoUpdater.on('error', (error) => {
    log.error('更新检查出错:', error);
    sendStatusToWindow(mainWindow, 'error', {
      message: error.message || '检查更新时出错',
    });
  });

  // 检查更新中
  autoUpdater.on('checking-for-update', () => {
    log.info('正在检查更新...');
    sendStatusToWindow(mainWindow, 'checking', {
      message: '正在检查更新...',
    });
  });

  // 有可用更新
  autoUpdater.on('update-available', (info) => {
    log.info('发现新版本:', info.version);
    sendStatusToWindow(mainWindow, 'available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });

    // 显示更新对话框
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 ${info.version}，是否立即下载？`,
      detail: `当前版本: ${app.getVersion()}\n新版本: ${info.version}`,
      buttons: ['立即下载', '稍后提醒'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  // 没有可用更新
  autoUpdater.on('update-not-available', (info) => {
    log.info('当前已是最新版本');
    sendStatusToWindow(mainWindow, 'not-available', {
      version: app.getVersion(),
      message: '当前已是最新版本',
    });
  });

  // 下载进度
  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    log.info(`下载进度: ${percent}%`);
    sendStatusToWindow(mainWindow, 'downloading', {
      percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  // 下载完成
  autoUpdater.on('update-downloaded', (info) => {
    log.info('更新下载完成:', info.version);
    sendStatusToWindow(mainWindow, 'downloaded', {
      version: info.version,
    });

    // 显示安装对话框
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新已就绪',
      message: '新版本已下载完成，是否立即安装？',
      detail: '安装将会重启应用程序',
      buttons: ['立即安装', '稍后安装'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  // 注册 IPC 事件
  registerIpcHandlers(mainWindow);
}

/**
 * 发送更新状态到渲染进程
 */
function sendStatusToWindow(mainWindow, status, data = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status, ...data });
  }
}

/**
 * 注册 IPC 事件处理
 */
function registerIpcHandlers(mainWindow) {
  // 检查更新
  ipcMain.handle('check-for-updates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        success: true,
        updateInfo: result?.updateInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 下载更新
  ipcMain.handle('download-update', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 安装更新
  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  // 获取当前版本
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // 设置自动下载
  ipcMain.handle('set-auto-download', (event, enabled) => {
    autoUpdater.autoDownload = enabled;
    return { success: true };
  });
}

/**
 * 手动检查更新
 */
async function checkForUpdates() {
  try {
    return await autoUpdater.checkForUpdates();
  } catch (error) {
    log.error('检查更新失败:', error);
    throw error;
  }
}

/**
 * 设置更新源
 * @param {Object} options - 更新源配置
 */
function setFeedURL(options) {
  autoUpdater.setFeedURL(options);
}

/**
 * 获取更新器实例
 */
function getAutoUpdater() {
  return autoUpdater;
}

module.exports = {
  initAutoUpdater,
  checkForUpdates,
  setFeedURL,
  getAutoUpdater,
};