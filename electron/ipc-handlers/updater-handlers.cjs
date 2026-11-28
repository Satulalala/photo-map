const { app, ipcMain } = require('electron');

function normalizeReleaseNotes(raw) {
  let text = '';
  if (typeof raw === 'string') {
    text = raw;
  } else if (Array.isArray(raw)) {
    text = raw
      .map(entry => (typeof entry === 'string' ? entry : entry?.note || ''))
      .filter(Boolean)
      .join('\n');
  }
  const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (stripped.length <= 300) return stripped;
  return `${stripped.slice(0, 297)}...`;
}

function normalizeFeedUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    if (!parsed.pathname.endsWith('/')) parsed.pathname += '/';
    return parsed.toString();
  } catch {
    return null;
  }
}

function formatUpdaterError(err) {
  const msg = String(err?.message || err || '');
  if (!msg) return '检查更新失败，请稍后重试';
  if (/net::|ENOTFOUND|ETIMEDOUT|ECONNREFUSED|ECONNRESET/i.test(msg)) {
    return '连接更新服务器失败，请检查网络连接';
  }
  return msg.slice(0, 140);
}

function registerUpdaterHandlers(ctx) {
  const { getMainWindow, log } = ctx || {};
  const customFeedUrl = normalizeFeedUrl(process.env.PHOTOMAP_UPDATE_URL);

  const state = {
    status: 'idle',
    currentVersion: app.getVersion(),
    version: '',
    releaseNotes: '',
    percent: 0,
    bytesPerSecond: 0,
    transferred: 0,
    total: 0,
    message: '',
    silent: false,
  };

  let updaterInstance = null;

  const emitState = patch => {
    Object.assign(state, patch);
    const win = typeof getMainWindow === 'function' ? getMainWindow() : null;
    if (win && !win.isDestroyed() && win.webContents?.send) {
      win.webContents.send('updater-status', { ...state });
    }
    return { ...state };
  };

  const ensureAutoUpdater = () => {
    if (updaterInstance) return updaterInstance;
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.logger = log;

    if (customFeedUrl) {
      if (!app.isPackaged) {
        autoUpdater.forceDevUpdateConfig = true;
      }
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: customFeedUrl,
        useMultipleRangeRequest: false,
      });
    }

    autoUpdater.on('checking-for-update', () => {
      emitState({ status: 'checking', message: '' });
    });

    autoUpdater.on('update-available', info => {
      emitState({
        status: 'available',
        version: info?.version || '',
        releaseNotes: normalizeReleaseNotes(info?.releaseNotes),
        percent: 0,
        bytesPerSecond: 0,
        transferred: 0,
        total: 0,
        message: '',
      });
    });

    autoUpdater.on('update-not-available', () => {
      emitState({ status: 'not-available', version: '', message: '' });
    });

    autoUpdater.on('download-progress', progress => {
      emitState({
        status: 'downloading',
        percent: Math.round(progress?.percent || 0),
        bytesPerSecond: progress?.bytesPerSecond || 0,
        transferred: progress?.transferred || 0,
        total: progress?.total || 0,
        message: '',
      });
    });

    autoUpdater.on('update-downloaded', info => {
      emitState({
        status: 'downloaded',
        version: info?.version || state.version,
        percent: 100,
        message: '',
      });
    });

    autoUpdater.on('error', err => {
      log?.warn?.('自动更新异常:', err?.message || err);
      if (state.silent && state.status === 'checking') {
        emitState({ status: 'idle', silent: false, message: '' });
        return;
      }
      emitState({
        status: 'error',
        silent: false,
        message: formatUpdaterError(err),
      });
    });

    updaterInstance = autoUpdater;
    return updaterInstance;
  };

  const checkForUpdates = async ({ silent = false } = {}) => {
    if (state.status === 'downloading' || state.status === 'downloaded') {
      return { ...state };
    }
    if (!app.isPackaged && !customFeedUrl) {
      return emitState({
        status: 'unsupported',
        silent,
        message: '开发模式不支持自动检查更新',
      });
    }
    emitState({ status: 'checking', silent, message: '' });
    try {
      await ensureAutoUpdater().checkForUpdates();
    } catch (err) {
      log?.warn?.('检查更新失败:', err?.message || err);
      if (silent) {
        return emitState({ status: 'idle', silent: false, message: '' });
      }
      return emitState({
        status: 'error',
        silent: false,
        message: formatUpdaterError(err),
      });
    }
    return { ...state };
  };

  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('get-updater-state', () => ({ ...state }));
  ipcMain.handle('check-for-updates', (_, opts) => checkForUpdates(opts));
  ipcMain.handle('download-update', () => {
    if (!updaterInstance || (state.status !== 'available' && state.status !== 'error')) {
      return { started: false };
    }
    ensureAutoUpdater().downloadUpdate().catch(err => {
      log?.warn?.('下载更新失败:', err?.message || err);
    });
    return { started: true };
  });

  ipcMain.handle('quit-and-install', () => {
    if (state.status !== 'downloaded') return false;
    setImmediate(() => {
      ensureAutoUpdater().quitAndInstall(false, true);
    });
    return true;
  });

  return { checkForUpdates };
}

module.exports = registerUpdaterHandlers;
