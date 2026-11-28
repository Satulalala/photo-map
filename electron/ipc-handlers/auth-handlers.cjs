const { app, BrowserWindow, ipcMain, safeStorage, session, shell } = require('electron');
const { isAppOriginUrl } = require('../security.cjs');

const DESKTOP_AUTH_RETURN_URL = 'photomap://app/index.html';
const AUTH_TOKEN_STORE_KEY = 'desktopAuthTokenEncrypted';
const AUTH_API_URL_FILTERS = [
  'https://photomap.satula.top/api/*',
  'http://localhost:3000/api/*',
  'http://127.0.0.1:3000/api/*',
  'http://localhost:3001/api/*',
  'http://127.0.0.1:3001/api/*',
];

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

function isTrustedAuthSender(event, getMainWindow) {
  const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : null;
  if (!mainWindow || mainWindow.isDestroyed?.() || event?.sender !== mainWindow.webContents) return false;
  const senderUrl = event.senderFrame?.url || event.sender?.getURL?.();
  return isAppOriginUrl(senderUrl, Boolean(app?.isPackaged));
}

function persistAuthToken(getStoreInstance, token) {
  if (typeof token !== 'string' || !token || !safeStorage?.isEncryptionAvailable()) return false;
  const encrypted = safeStorage.encryptString(token).toString('base64');
  getStoreInstance().set(AUTH_TOKEN_STORE_KEY, encrypted);
  return true;
}

function installAuthHeaderInterceptor(getStoreInstance, log) {
  if (!session?.defaultSession?.webRequest?.onBeforeSendHeaders) return;

  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: AUTH_API_URL_FILTERS },
    (details, callback) => {
      const requestHeaders = { ...details.requestHeaders };
      for (const name of Object.keys(requestHeaders)) {
        if (name.toLowerCase() === 'authorization') delete requestHeaders[name];
      }

      try {
        const encrypted = getStoreInstance().get(AUTH_TOKEN_STORE_KEY);
        if (typeof encrypted === 'string' && safeStorage?.isEncryptionAvailable()) {
          const token = safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
          if (token) requestHeaders.Authorization = `Bearer ${token}`;
        }
      } catch {
        log?.warn?.('桌面云同步凭据解密失败');
      }

      callback({ requestHeaders });
    }
  );
}

function registerAuthHandlers(ctx) {
  const { getMainWindow, log } = ctx || {};

  ipcMain.handle('store-auth-token', (event, token) => {
    if (!isTrustedAuthSender(event, getMainWindow)) return { ok: false, error: '请求来源无效' };
    if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
      return { ok: false, error: '登录凭据格式无效' };
    }
    if (!safeStorage?.isEncryptionAvailable()) {
      return { ok: false, error: '本机安全存储不可用，请检查系统账户后重试' };
    }

    try {
      if (!persistAuthToken(ctx.getStoreInstance, token)) {
        return { ok: false, error: '本机安全存储不可用，请检查系统账户后重试' };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: '无法安全保存登录状态' };
    }
  });

  ipcMain.handle('clear-auth-token', event => {
    if (!isTrustedAuthSender(event, getMainWindow)) return { ok: false, error: '请求来源无效' };
    try {
      ctx.getStoreInstance().delete(AUTH_TOKEN_STORE_KEY);
      return { ok: true };
    } catch {
      return { ok: false, error: '无法清除登录状态' };
    }
  });

  if (app?.whenReady) {
    void app.whenReady()
      .then(() => installAuthHeaderInterceptor(ctx.getStoreInstance, log))
      .catch(() => log?.warn?.('无法启用桌面云同步凭据注入'));
  }

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
          const cookies = authWindow.webContents?.session?.cookies;
          if (cookies?.flushStore) await cookies.flushStore().catch(() => {});
          if (callbackResult.status === 'github-success' && typeof cookies?.get === 'function') {
            const [sessionCookie] = await cookies.get({
              url: new URL(authUrl).origin,
              name: 'photomap_session',
            });
            if (sessionCookie?.value) persistAuthToken(getStoreInstance, sessionCookie.value);
          }
        } catch {
          log?.warn?.('GitHub 登录会话无法保存到桌面安全存储');
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
