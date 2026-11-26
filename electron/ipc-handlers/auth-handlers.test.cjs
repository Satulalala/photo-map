const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createHarness() {
  const handlers = {};
  const openedExternal = [];
  const createdWindows = [];
  const mainWindow = {
    destroyed: false,
    isDestroyed() {
      return this.destroyed;
    },
  };

  class MockBrowserWindow {
    constructor(options) {
      this.options = options;
      this.destroyed = false;
      this.focused = 0;
      this.closedCalls = 0;
      this.menuVisible = true;
      this.menuRemoved = false;
      this.loadedUrls = [];
      this.listeners = new Map();
      this.webContentsListeners = new Map();
      this.windowOpenHandler = null;
      this.flushCount = 0;
      this.webContents = {
        on: (event, fn) => {
          if (!this.webContentsListeners.has(event)) this.webContentsListeners.set(event, []);
          this.webContentsListeners.get(event).push(fn);
        },
        setWindowOpenHandler: fn => {
          this.windowOpenHandler = fn;
        },
        session: {
          cookies: {
            flushStore: async () => {
              this.flushCount += 1;
            },
          },
        },
      };
      createdWindows.push(this);
    }

    on(event, fn) {
      if (!this.listeners.has(event)) this.listeners.set(event, []);
      this.listeners.get(event).push(fn);
    }

    emit(event, ...args) {
      for (const fn of this.listeners.get(event) || []) fn(...args);
    }

    emitWebContents(event, ...args) {
      for (const fn of this.webContentsListeners.get(event) || []) fn(...args);
    }

    setMenuBarVisibility(visible) {
      this.menuVisible = visible;
    }

    removeMenu() {
      this.menuRemoved = true;
    }

    isDestroyed() {
      return this.destroyed;
    }

    focus() {
      this.focused += 1;
    }

    loadURL(url) {
      this.loadedUrls.push(url);
      return Promise.resolve();
    }

    close() {
      this.closedCalls += 1;
      this.destroyed = true;
      this.emit('closed');
    }
  }

  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'auth-handlers.cjs'), 'utf8'), {
    module,
    URL,
    Promise,
    encodeURIComponent,
    Number,
    String,
    require: name => {
      if (name === 'electron') {
        return {
          BrowserWindow: MockBrowserWindow,
          ipcMain: {
            handle: (channel, fn) => {
              handlers[channel] = fn;
            },
          },
          shell: {
            openExternal: url => openedExternal.push(url),
          },
        };
      }
      return require(name);
    },
  });

  const registerAuthHandlers = module.exports;
  registerAuthHandlers({
    getMainWindow: () => mainWindow,
    log: { warn() {}, info() {}, error() {} },
  });

  return {
    registerAuthHandlers,
    openGitHubAuth: url => handlers['open-github-auth'](null, url),
    createdWindows,
    openedExternal,
  };
}

const toPlain = value => (value && typeof value === 'object' ? { ...value } : value);

test('validates GitHub auth URLs and parses desktop callback results', () => {
  const { registerAuthHandlers } = createHarness();
  const { isValidGitHubAuthUrl, parseDesktopAuthCallbackUrl } = registerAuthHandlers;

  assert.equal(
    isValidGitHubAuthUrl(
      'https://photomap.satula.top/api/v1/auth/github?return_to=photomap%3A%2F%2Fapp%2Findex.html'
    ),
    true
  );
  assert.equal(
    isValidGitHubAuthUrl(
      'http://localhost:8787/api/v1/auth/github?return_to=photomap%3A%2F%2Fapp%2Findex.html'
    ),
    true
  );
  assert.equal(isValidGitHubAuthUrl('https://evil.example/api/v1/auth/github?return_to=https://evil.example'), false);
  assert.equal(isValidGitHubAuthUrl('https://photomap.satula.top/other?return_to=photomap://app/index.html'), false);

  assert.deepEqual(
    toPlain(parseDesktopAuthCallbackUrl('photomap://app/index.html?auth=github-success')),
    { status: 'github-success', reason: '' }
  );
  assert.deepEqual(
    toPlain(parseDesktopAuthCallbackUrl('photomap://app/index.html?auth=error&auth_reason=account_conflict')),
    { status: 'error', reason: 'account_conflict' }
  );
  assert.equal(parseDesktopAuthCallbackUrl('https://github.com/login'), null);
});

test('opens a framed preload-free auth window, flushes cookies, and closes on callback', async () => {
  const { openGitHubAuth, createdWindows, openedExternal } = createHarness();
  const authUrl =
    'https://photomap.satula.top/api/v1/auth/github?return_to=photomap%3A%2F%2Fapp%2Findex.html';

  const firstPromise = openGitHubAuth(authUrl);
  assert.equal(createdWindows.length, 1);

  const authWin = createdWindows[0];
  assert.equal(authWin.options.frame, true);
  assert.equal(authWin.options.webPreferences.preload, undefined);
  assert.equal(authWin.options.webPreferences.contextIsolation, true);
  assert.equal(authWin.options.webPreferences.sandbox, true);
  assert.equal(authWin.menuVisible, false);
  assert.equal(authWin.menuRemoved, true);
  assert.deepEqual(authWin.loadedUrls, [authUrl]);

  // Duplicate click while window is open focuses existing window without spawning another
  const secondPromise = openGitHubAuth(authUrl);
  assert.equal(createdWindows.length, 1);
  assert.equal(authWin.focused, 1);

  // External popups (e.g. Terms / Forgot password) open externally and deny new BrowserWindow
  const openResult = authWin.windowOpenHandler({ url: 'https://github.com/password_reset' });
  assert.deepEqual(toPlain(openResult), { action: 'deny' });
  assert.deepEqual(openedExternal, ['https://github.com/password_reset']);

  let prevented = false;
  authWin.emitWebContents(
    'will-redirect',
    { preventDefault: () => { prevented = true; } },
    'photomap://app/index.html?auth=github-success'
  );

  const [firstResult, secondResult] = await Promise.all([firstPromise, secondPromise]);
  assert.equal(prevented, true);
  assert.equal(authWin.flushCount, 1);
  assert.equal(authWin.closedCalls, 1);
  assert.deepEqual(toPlain(firstResult), { status: 'github-success', reason: '' });
  assert.deepEqual(toPlain(secondResult), { status: 'github-success', reason: '' });
});

test('returns closed status when user manually closes the auth window', async () => {
  const { openGitHubAuth, createdWindows } = createHarness();
  const authUrl =
    'https://photomap.satula.top/api/v1/auth/github?return_to=photomap%3A%2F%2Fapp%2Findex.html';

  const pendingResult = openGitHubAuth(authUrl);
  const authWin = createdWindows[0];
  authWin.close();

  const result = await pendingResult;
  assert.deepEqual(toPlain(result), { status: 'closed', reason: '' });
});
