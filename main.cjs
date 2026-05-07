// V8 编译缓存 - 加速启动
require('v8-compile-cache');

// ========== 核心模块（立即加载）==========
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

// ========== 延迟加载模块（首次使用时加载）==========
const lazyRequire = (name, loader) => {
  let module;
  return () => {
    if (!module) {
      const start = Date.now();
      module = loader();
      log.debug(`延迟加载 ${name}: ${Date.now() - start}ms`);
    }
    return module;
  };
};

const getCrypto = lazyRequire('crypto', () => require('crypto'));
const getStore = lazyRequire('electron-store', () => require('electron-store'));
const getDb = lazyRequire('database', () => require('./database.cjs'));
const getSharp = lazyRequire('sharp', () => require('sharp'));
const getExifParser = lazyRequire('exif-parser', () => require('exif-parser'));
const getEmbedding = lazyRequire('embedding', () => require('./embeddingService.cjs'));

// ========== 日志系统配置 ==========
log.transports.file.level = 'info';
log.transports.file.maxSize = 5 * 1024 * 1024;
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';
log.transports.console.level = 'debug';

process.on('uncaughtException', (error) => {
  log.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason) => {
  log.error('未处理的 Promise 拒绝:', reason);
});

if (app.isPackaged) {
  Object.assign(console, log.functions);
}

log.info('========== 应用启动 ==========');
log.info('版本:', app.getVersion());
log.info('Electron:', process.versions.electron);
log.info('Node:', process.versions.node);
log.info('平台:', process.platform, process.arch);

setTimeout(() => {
  try {
    getSharp();
    log.info('sharp模块测试: 加载成功');
  } catch (e) {
    log.error('sharp模块测试: 加载失败', e.message);
  }
}, 1000);

// 启用硬件加速和 WebGL
app.commandLine.appendSwitch('enable-webgl');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('high-dpi-support', '1');

// 开发模式热更新
const isDev = !app.isPackaged;
if (isDev) {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit',
      forceHardReset: false,
    });
  } catch {}
}

let store;
let mainWindow;

const getStoreInstance = () => {
  if (!store) {
    const Store = getStore();
    store = new Store();
  }
  return store;
};

// 目录
const TILE_CACHE_DIR = path.join(app.getPath('userData'), 'tile-cache');
const PHOTO_DIR = path.join(app.getPath('userData'), 'photos');
const THUMB_DIR = path.join(app.getPath('userData'), 'thumbnails');

const THUMB_SIZE = 200;
const THUMB_QUALITY = 80;
const PLACEHOLDER_SIZE = 20;
const PLACEHOLDER_DIR = path.join(app.getPath('userData'), 'placeholders');

function ensurePhotoDir() {
  if (!fs.existsSync(PHOTO_DIR)) fs.mkdirSync(PHOTO_DIR, { recursive: true });
  if (!fs.existsSync(THUMB_DIR)) fs.mkdirSync(THUMB_DIR, { recursive: true });
  if (!fs.existsSync(PLACEHOLDER_DIR)) fs.mkdirSync(PLACEHOLDER_DIR, { recursive: true });
}

async function generateThumbnail(photoId) {
  let sharpInstance = null;
  try {
    const photoPath = path.join(PHOTO_DIR, photoId);
    const thumbId = photoId.replace(/\.[^.]+$/, '.webp');
    const thumbPath = path.join(THUMB_DIR, thumbId);

    if (!fs.existsSync(photoPath)) return null;
    if (fs.existsSync(thumbPath)) return { thumbPath, thumbId };

    sharpInstance = getSharp()(photoPath);
    await sharpInstance
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover', position: 'center' })
      .webp({ quality: THUMB_QUALITY })
      .toFile(thumbPath);

    return { thumbPath, thumbId };
  } catch (e) {
    console.error('生成缩略图失败:', e.message);
    return null;
  } finally {
    if (sharpInstance) { try { sharpInstance.destroy(); } catch {} }
  }
}

async function generatePlaceholder(photoId) {
  let sharpInstance = null;
  try {
    const photoPath = path.join(PHOTO_DIR, photoId);
    const placeholderId = photoId.replace(/\.[^.]+$/, '.webp');
    const placeholderPath = path.join(PLACEHOLDER_DIR, placeholderId);

    if (!fs.existsSync(photoPath)) return null;
    if (fs.existsSync(placeholderPath)) return { placeholderPath, placeholderId };

    sharpInstance = getSharp()(photoPath);
    await sharpInstance
      .resize(PLACEHOLDER_SIZE, PLACEHOLDER_SIZE, { fit: 'cover', position: 'center' })
      .webp({ quality: 20 })
      .toFile(placeholderPath);

    return { placeholderPath, placeholderId };
  } catch (e) {
    console.error('生成占位图失败:', e.message);
    return null;
  } finally {
    if (sharpInstance) { try { sharpInstance.destroy(); } catch {} }
  }
}

function getImageUrl(imagePath) {
  if (!fs.existsSync(imagePath)) return null;

  if (app.isPackaged) {
    return 'file://' + imagePath.replace(/\\/g, '/');
  }

  try {
    const data = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch {
    return null;
  }
}

async function safeDeleteFile(filePath, maxRetries = 3, delay = 100) {
  if (!fs.existsSync(filePath)) return true;

  for (let i = 0; i < maxRetries; i++) {
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch (e) {
      if (e.code === 'EPERM' || e.code === 'EBUSY') {
        if (i < maxRetries - 1) {
          await new Promise(r => setTimeout(r, delay * (i + 1)));
          continue;
        }
        log.warn(`文件被占用，将在下次启动时删除: ${filePath}`);
        return false;
      }
      throw e;
    }
  }
  return false;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    backgroundColor: '#f8fafc',
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#ffffff',
      height: 32
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: false,
      enableWebSQL: false,
      spellcheck: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com blob:",
            "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
            "img-src 'self' data: blob: file: https://*.mapbox.com https://*.tiles.mapbox.com",
            "font-src 'self' data:",
            "connect-src 'self' https://api.mapbox.com https://*.mapbox.com https://*.tiles.mapbox.com https://restapi.amap.com ws://localhost:* http://localhost:*",
            "worker-src 'self' blob:",
            "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'"
          ].join('; ')
        ]
      }
    });
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    if (input.control && input.shift && input.key === 'I') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
  } else {
    console.log('开发模式：连接 localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.openDevTools({ mode: 'right' });
    });
  }
}

async function preheatDatabase() {
  const start = Date.now();
  try {
    getDb().getStats();
    getDb().getAllMarkers();
    log.info(`数据库预热完成: ${Date.now() - start}ms`);
  } catch (e) {
    log.warn('数据库预热失败:', e.message);
  }
}

// ========== 注册 IPC 处理器 ==========
const ctx = {
  getMainWindow: () => mainWindow,
  getCrypto,
  getSharp,
  getExifParser,
  getDb,
  getEmbedding,
  getStoreInstance,
  PHOTO_DIR,
  THUMB_DIR,
  PLACEHOLDER_DIR,
  TILE_CACHE_DIR,
  ensurePhotoDir,
  generateThumbnail,
  generatePlaceholder,
  getImageUrl,
  safeDeleteFile,
  log,
};

require('./ipc-handlers/photo-handlers.cjs')(ctx);
require('./ipc-handlers/database-handlers.cjs')(ctx);
require('./ipc-handlers/search-handlers.cjs')(ctx);
require('./ipc-handlers/ai-handlers.cjs')(ctx);
require('./ipc-handlers/cache-handlers.cjs')(ctx);
require('./ipc-handlers/system-handlers.cjs')(ctx);

// ========== 应用生命周期 ==========
app.whenReady().then(async () => {
  log.info('应用就绪，初始化数据库...');
  getDb().initDatabase(app.getPath('userData'));
  log.info('数据库初始化完成');

  const oldMarkers = getStoreInstance().get('markers', []);
  if (oldMarkers.length > 0) {
    console.log('发现旧数据，开始迁移...');
    getDb().migrateFromStore(oldMarkers);
    getStoreInstance().delete('markers');
    console.log('旧数据迁移完成并已清理');
  }

  getDb().cleanupInvalidPhotos();

  const { session } = require('electron');
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://events.mapbox.com/*'] }, (_, callback) => {
    callback({ cancel: true });
  });
  Menu.setApplicationMenu(null);
  createWindow();

  setImmediate(preheatDatabase);

  setImmediate(async () => {
    try {
      const start = Date.now();
      log.info('[Embedding] 后台预加载语义搜索模型...');

      const embedding = getEmbedding();
      embedding.setProgressCallback((progressData) => {
        const { progress, loaded, total } = progressData;
        const pct = Math.round(progress * 100);
        const loadedMb = (loaded / 1024 / 1024).toFixed(1);
        const totalMb = (total / 1024 / 1024).toFixed(1);
        log.info(`[Embedding] 下载中 ${pct}% (${loadedMb}MB / ${totalMb}MB)`);

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('embedding-progress', {
            percent: pct,
            loaded: loadedMb,
            total: totalMb,
          });
        }
      });

      await embedding.warmup();
      log.info(`[Embedding] 模型预加载完成: ${Date.now() - start}ms`);
    } catch (e) {
      log.warn('[Embedding] 模型预加载跳过:', e.message);
    }
  });
});

app.on('window-all-closed', () => {
  log.info('所有窗口已关闭，正在退出...');
  getDb().closeDatabase();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  log.info('========== 应用退出 ==========');
});
