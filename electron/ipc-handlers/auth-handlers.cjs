const { BrowserWindow, ipcMain, shell } = require('electron');

const DESKTOP_AUTH_RETURN_URL = 'photomap://app/index.html';

let activeAuthWindow = null;
let activeAuthPromise = null;

function isValidGitHubAuthUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);
    const isLocalHttp =
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
    if (parsed.protocol !== 'https:' && !isLocalHttp) {
      return false;
    }
    if (parsed.pathname !== '/api/v1/auth/github') {
      return false;
    }
    return parsed.searchParams.get('return_to') === DESKTOP_AUTH_RETURN_URL;
  } catch {
    return false;
  }
}

function parseDesktopAuthCallbackUrl(rawUrl, expectedReturnTo = DESKTOP_AUTH_RETURN_URL) {
  if (typeof rawUrl !== 'string' || !rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    const target = new URL(expectedReturnTo);
    if (
      parsed.protocol !== target.protocol ||
      parsed.host !== target.host ||
      parsed.pathname !== target.pathname
    ) {
      return null;
    }
    const status = parsed.searchParams.get('auth');
    if (!status) return null;
    return {
      status,
      reason: parsed.searchParams.get('auth_reason') || '',
    };
  } catch {
    return null;
  }
}

function buildAuthLoadErrorHtml(errorCode) {
  const safeCode = Number.isFinite(Number(errorCode)) ? String(Number(errorCode)) : '未知';
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>GitHub 登录加载失败</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; display: grid; place-items: center; min-height: 100vh; }
    .card { max-width: 360px; margin: 24px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; text-align: center; }
    h1 { margin: 0 0 8px; font-size: 16px; }
    p { margin: 0; font-size: 13px; line-height: 1.6; color: #475569; }
    .code { margin-top: 12px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <h1>无法打开 GitHub 登录页面</h1>
    <p>请检查网络连接或代理设置后，关闭此窗口并在应用中重试。</p>
    <p class="code">错误代码：${safeCode}</p>
  </div>
</body>
</html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function registerAuthHandlers(ctx) {
  const { getMainWindow, log } = ctx || {};

  ipcMain.handle('open-github-auth', async (_, authUrl) => {
    if (!isValidGitHubAuthUrl(authUrl)) {
      return { status: 'error', reason: 'invalid_url' };
    }

    if (activeAuthWindow && !activeAuthWindow.isDestroyed() && activeAuthPromise) {
      activeAuthWindow.focus();
      return activeAuthPromise;
    }

    const mainWin = typeof getMainWindow === 'function' ? getMainWindow() : null;

    activeAuthPromise = new Promise(resolve => {
      let settled = false;
      let handlingCallback = false;

      const authWindow = new BrowserWindow({
        width: 520,
        height: 740,
        minWidth: 420,
        minHeight: 560,
        title: 'GitHub 登录 - 地图相册',
        parent: mainWin && !mainWin.isDestroyed() ? mainWin : undefined,
        modal: false,
        frame: true,
        autoHideMenuBar: true,
        backgroundColor: '#ffffff',
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
          allowRunningInsecureContent: false,
        },
      });

      activeAuthWindow = authWindow;
      authWindow.setMenuBarVisibility(false);
      authWindow.removeMenu();

      const finish = result => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      const handleCallback = async (event, targetUrl) => {
        const callbackResult = parseDesktopAuthCallbackUrl(targetUrl, DESKTOP_AUTH_RETURN_URL);
        if (!callbackResult) return;

        if (event && typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        if (settled || handlingCallback) return;
        handlingCallback = true;

        try {
          if (authWindow.webContents?.session?.cookies?.flushStore) {
            await authWindow.webContents.session.cookies.flushStore().catch(() => {});
          }
        } finally {
          finish(callbackResult);
          if (!authWindow.isDestroyed()) {
            authWindow.close();
          }
        }
      };

      authWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:\/\//i.test(url)) {
          shell.openExternal(url);
        }
        return { action: 'deny' };
      });

      authWindow.webContents.on('will-redirect', handleCallback);
      authWindow.webContents.on('will-navigate', handleCallback);
      authWindow.webContents.on('did-navigate', (_, url) => {
        void handleCallback(null, url);
      });

      authWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, __, isMainFrame) => {
        if (errorCode === -3 || !isMainFrame || settled || handlingCallback) return;
        log?.warn?.(`GitHub 登录窗口加载失败 (${errorCode}): ${errorDescription || 'unknown'}`);
        if (!authWindow.isDestroyed()) {
          authWindow.loadURL(buildAuthLoadErrorHtml(errorCode));
        }
      });

      authWindow.on('closed', () => {
        if (activeAuthWindow === authWindow) {
          activeAuthWindow = null;
          activeAuthPromise = null;
        }
        finish({ status: 'closed', reason: '' });
      });

      Promise.resolve(authWindow.loadURL(authUrl)).catch(error => {
        if (settled || handlingCallback) return;
        log?.warn?.('GitHub 登录窗口初始化失败:', error?.message || error);
      });
    });

    return activeAuthPromise;
  });
}

registerAuthHandlers.isValidGitHubAuthUrl = isValidGitHubAuthUrl;
registerAuthHandlers.parseDesktopAuthCallbackUrl = parseDesktopAuthCallbackUrl;

module.exports = registerAuthHandlers;
