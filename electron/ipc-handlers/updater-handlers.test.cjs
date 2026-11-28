const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createHarness({ isPackaged = true, version = '1.3.1', customFeed = '' } = {}) {
  const handlers = {};
  const sentMessages = [];
  let quitAndInstallCalls = [];
  let checkCalls = 0;
  let downloadCalls = 0;

  class MockAutoUpdater extends EventEmitter {
    constructor() {
      super();
      this.autoDownload = true;
      this.autoInstallOnAppQuit = false;
      this.forceDevUpdateConfig = false;
      this.logger = null;
      this.feedConfig = null;
    }

    setFeedURL(cfg) {
      this.feedConfig = cfg;
    }

    async checkForUpdates() {
      checkCalls += 1;
      return null;
    }

    async downloadUpdate() {
      downloadCalls += 1;
      return [];
    }

    quitAndInstall(isSilent, isForceRunAfter) {
      quitAndInstallCalls.push({ isSilent, isForceRunAfter });
    }
  }

  const autoUpdater = new MockAutoUpdater();
  const mainWindow = {
    isDestroyed: () => false,
    webContents: {
      send: (channel, payload) => {
        sentMessages.push({ channel, payload });
      },
    },
  };

  const env = { ...process.env };
  if (customFeed) env.PHOTOMAP_UPDATE_URL = customFeed;
  else delete env.PHOTOMAP_UPDATE_URL;

  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'updater-handlers.cjs'), 'utf8'), {
    module,
    process: { ...process, env },
    URL,
    Promise,
    setImmediate,
    require: name => {
      if (name === 'electron') {
        return {
          app: {
            isPackaged,
            getVersion: () => version,
          },
          ipcMain: {
            handle: (channel, fn) => {
              handlers[channel] = fn;
            },
          },
        };
      }
      if (name === 'electron-updater') {
        return { autoUpdater };
      }
      return require(name);
    },
  });

  const registerUpdaterHandlers = module.exports;
  const controller = registerUpdaterHandlers({
    getMainWindow: () => mainWindow,
    log: { warn() {}, info() {}, error() {} },
  });

  return {
    controller,
    autoUpdater,
    handlers,
    sentMessages,
    getCounts: () => ({ checkCalls, downloadCalls, quitAndInstallCalls }),
  };
}

const toPlain = value => (value && typeof value === 'object' ? { ...value } : value);

test('installed desktop updater disables autoDownload, tracks progress, and quits to install', async () => {
  const { autoUpdater, handlers, sentMessages, getCounts } = createHarness({ isPackaged: true, version: '1.3.1' });

  await handlers['check-for-updates'](null, { silent: false });
  assert.equal(autoUpdater.autoDownload, false);
  assert.equal(getCounts().checkCalls, 1);
  assert.equal((await handlers['download-update']()).started, false);

  autoUpdater.emit('update-available', {
    version: '1.3.2',
    releaseNotes: '<p>支持自动更新</p>',
  });

  let state = toPlain(await handlers['get-updater-state']());
  assert.equal(state.status, 'available');
  assert.equal(state.version, '1.3.2');
  assert.equal(state.releaseNotes, '支持自动更新');
  assert.equal(getCounts().downloadCalls, 0);

  const downloadRes = toPlain(await handlers['download-update']());
  assert.equal(downloadRes.started, true);
  assert.equal(getCounts().downloadCalls, 1);

  autoUpdater.emit('download-progress', { percent: 48.6, bytesPerSecond: 2048000, transferred: 500, total: 1000 });
  autoUpdater.emit('update-downloaded', { version: '1.3.2' });

  state = toPlain(await handlers['get-updater-state']());
  assert.equal(state.status, 'downloaded');
  assert.equal(state.percent, 100);

  assert.equal(await handlers['quit-and-install'](), true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(getCounts().quitAndInstallCalls.length, 1);
  assert.ok(sentMessages.some(msg => msg.channel === 'updater-status' && msg.payload.status === 'downloaded'));
});

test('unpackaged dev mode reports unsupported and silent errors stay idle', async () => {
  const devHarness = createHarness({ isPackaged: false, version: '1.3.1' });
  const devState = toPlain(await devHarness.handlers['check-for-updates'](null, { silent: false }));
  assert.equal(devState.status, 'unsupported');

  const prodHarness = createHarness({ isPackaged: true, version: '1.3.1' });
  prodHarness.autoUpdater.checkForUpdates = async () => {
    throw new Error('net::ERR_INTERNET_DISCONNECTED');
  };
  const silentState = toPlain(await prodHarness.controller.checkForUpdates({ silent: true }));
  assert.equal(silentState.status, 'idle');
  assert.equal(silentState.message, '');
});

test('custom update feed uses single range requests', async () => {
  const { autoUpdater, controller } = createHarness({ customFeed: 'http://127.0.0.1:12345/updates' });
  await controller.checkForUpdates();
  assert.deepEqual(toPlain(autoUpdater.feedConfig), {
    provider: 'generic',
    url: 'http://127.0.0.1:12345/updates/',
    useMultipleRangeRequest: false,
  });
});
