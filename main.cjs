// V8 编译缓存 - 加速启动
require('v8-compile-cache');

// ========== 核心模块（立即加载）==========
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
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

// ========== 日志系统配置 ==========
// 日志文件位置: %USERPROFILE%\AppData\Roaming\photo-map\logs\
log.transports.file.level = 'info';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';
log.transports.console.level = 'debug';

// 捕获未处理的异常
process.on('uncaughtException', (error) => {
  log.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason) => {
  log.error('未处理的 Promise 拒绝:', reason);
});

// 替换 console 方法（可选，开发时保留原始 console）
if (app.isPackaged) {
  Object.assign(console, log.functions);
}

log.info('========== 应用启动 ==========');
log.info('版本:', app.getVersion());
log.info('Electron:', process.versions.electron);
log.info('Node:', process.versions.node);
log.info('平台:', process.platform, process.arch);

// 测试sharp模块
setTimeout(() => {
  try {
    const sharp = getSharp();
    log.info('sharp模块测试: 加载成功');
  } catch (e) {
    log.error('sharp模块测试: 加载失败', e.message);
  }
}, 1000);

// 启用硬件加速和 WebGL
app.commandLine.appendSwitch('enable-webgl');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');

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

let store; // 延迟初始化
let mainWindow;

// 获取 store 实例（延迟初始化）
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

// 缩略图配置
const THUMB_SIZE = 200; // 缩略图尺寸
const THUMB_QUALITY = 80; // WebP质量
const PLACEHOLDER_SIZE = 20; // LQIP 占位图尺寸
const PLACEHOLDER_DIR = path.join(app.getPath('userData'), 'placeholders');

function ensurePhotoDir() {
  if (!fs.existsSync(PHOTO_DIR)) fs.mkdirSync(PHOTO_DIR, { recursive: true });
  if (!fs.existsSync(THUMB_DIR)) fs.mkdirSync(THUMB_DIR, { recursive: true });
  if (!fs.existsSync(PLACEHOLDER_DIR)) fs.mkdirSync(PLACEHOLDER_DIR, { recursive: true });
}

// 生成缩略图（WebP格式，体积减少30-50%）
// 优化：使用流式处理，及时释放 Buffer 避免内存堆积
async function generateThumbnail(photoId) {
  let sharpInstance = null;
  try {
    const photoPath = path.join(PHOTO_DIR, photoId);
    // 缩略图使用 .webp 扩展名
    const thumbId = photoId.replace(/\.[^.]+$/, '.webp');
    const thumbPath = path.join(THUMB_DIR, thumbId);
    
    if (!fs.existsSync(photoPath)) return null;
    if (fs.existsSync(thumbPath)) return { thumbPath, thumbId };
    
    // 创建 sharp 实例并保存引用，便于后续释放
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
    // 及时释放 sharp 实例占用的内存
    if (sharpInstance) {
      try { sharpInstance.destroy(); } catch {}
    }
  }
}

// 生成 LQIP 模糊占位图（极小尺寸，快速加载）
// 优化：及时释放 Buffer 避免内存堆积
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
    if (sharpInstance) {
      try { sharpInstance.destroy(); } catch {}
    }
  }
}

// WebGL 配置
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-webgl');
app.commandLine.appendSwitch('use-angle', 'gl');
app.commandLine.appendSwitch('enable-gpu-rasterization');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    backgroundColor: '#f8fafc',
    frame: false,           // 无边框窗口
    titleBarStyle: 'hidden', // 隐藏标题栏
    titleBarOverlay: {      // Windows 11 风格的窗口控制按钮
      color: '#00000000',   // 透明背景
      symbolColor: '#ffffff', // 白色图标（适配深色背景）
      height: 32
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: false,
      enableWebSQL: false,
      spellcheck: false,
      // 安全加固
      sandbox: true,                    // 沙箱模式
      webSecurity: true,                // 启用同源策略
      allowRunningInsecureContent: false // 禁止加载不安全内容
    }
  });

  // ========== CSP 安全策略 ==========
  // Content Security Policy - 防止 XSS 和代码注入攻击
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self'",
            // 脚本：允许自身和 Mapbox
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com blob:",
            // 样式：允许自身和内联样式（React 需要）
            "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
            // 图片：允许自身、data URI、file 协议、Mapbox 瓦片
            "img-src 'self' data: blob: file: https://*.mapbox.com https://*.tiles.mapbox.com",
            // 字体：允许自身和 data URI
            "font-src 'self' data:",
            // 连接：允许 Mapbox API 和本地开发服务器
            "connect-src 'self' https://api.mapbox.com https://*.mapbox.com https://*.tiles.mapbox.com ws://localhost:* http://localhost:*",
            // Worker：允许 blob（Mapbox GL 需要）
            "worker-src 'self' blob:",
            // 子框架：禁止
            "frame-src 'none'",
            // 对象：禁止（Flash 等插件）
            "object-src 'none'",
            // 基础 URI：仅自身
            "base-uri 'self'",
            // 表单提交：仅自身
            "form-action 'self'"
          ].join('; ')
        ]
      }
    });
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // F12 打开开发者工具
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    // Ctrl+Shift+I 也可以打开
    if (input.control && input.shift && input.key === 'I') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
  } else {
    console.log('开发模式：连接 localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
    // 延迟打开DevTools，确保窗口加载完成
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.openDevTools({ mode: 'right' });
    });
  }
}

// 数据库预热 - 预加载常用数据到缓存
async function preheatDatabase() {
  const start = Date.now();
  try {
    // 预热：获取统计信息（触发表扫描，预热缓存）
    getDb().getStats();
    // 预热：获取所有标记（最常用的查询）
    getDb().getAllMarkers();
    log.info(`数据库预热完成: ${Date.now() - start}ms`);
  } catch (e) {
    log.warn('数据库预热失败:', e.message);
  }
}

app.whenReady().then(async () => {
  log.info('应用就绪，初始化数据库...');
  // 初始化数据库
  getDb().initDatabase(app.getPath('userData'));
  log.info('数据库初始化完成');
  
  // 迁移旧数据（如果有）
  const oldMarkers = getStoreInstance().get('markers', []);
  if (oldMarkers.length > 0) {
    console.log('发现旧数据，开始迁移...');
    getDb().migrateFromStore(oldMarkers);
    getStoreInstance().delete('markers'); // 迁移后删除旧数据
    console.log('旧数据迁移完成并已清理');
  }
  
  // 清理无效照片记录（file_id 为 null 的旧 base64 数据）
  getDb().cleanupInvalidPhotos();
  
  const { session } = require('electron');
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://events.mapbox.com/*'] }, (_, callback) => {
    callback({ cancel: true });
  });
  Menu.setApplicationMenu(null);
  createWindow();
  
  // 窗口显示后异步预热数据库（不阻塞启动）
  setImmediate(preheatDatabase);
});

app.on('window-all-closed', () => {
  log.info('所有窗口已关闭，正在退出...');
  getDb().closeDatabase();
  if (process.platform !== 'darwin') app.quit();
});

// 应用退出前
app.on('before-quit', () => {
  log.info('========== 应用退出 ==========');
});


// ========== 照片文件管理 ==========

ipcMain.handle('select-photos', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
  });
  if (result.canceled) return [];
  
  ensurePhotoDir();
  const photos = [];
  
  for (const filePath of result.filePaths) {
    const ext = path.extname(filePath).toLowerCase();
    const id = getCrypto().randomUUID() + (ext === '.jpeg' ? '.jpg' : ext);
    const destPath = path.join(PHOTO_DIR, id);
    
    // 复制原图
    fs.copyFileSync(filePath, destPath);
    
    // 异步生成缩略图和占位图（不阻塞）
    generateThumbnail(id).catch(() => {});
    generatePlaceholder(id).catch(() => {});
    
    photos.push({ id });
  }
  
  return photos;
});

// 获取原图（返�?base64 数据URL，兼容开发模式）
// 辅助函数：根据环境返回图片URL或base64
function getImageUrl(imagePath) {
  if (!fs.existsSync(imagePath)) return null;
  
  // 生产模式：直接返回 file:// URL（更快，省内存）
  if (app.isPackaged) {
    return 'file://' + imagePath.replace(/\\/g, '/');
  }
  
  // 开发模式：返回 base64（绕过浏览器安全限制）
  try {
    const data = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch {
    return null;
  }
}

// 获取原图
ipcMain.handle('get-photo-url', (_, photoId) => {
  if (photoId?.startsWith('data:')) return photoId;
  return getImageUrl(path.join(PHOTO_DIR, photoId));
});

// 获取缩略图（WebP格式，优先缩略图，没有则生成或回退原图）
ipcMain.handle('get-thumbnail-url', async (_, photoId) => {
  if (!photoId || photoId.startsWith('data:')) return photoId;
  
  // 缩略图使�?.webp 扩展�?
  const thumbId = photoId.replace(/\.[^.]+$/, '.webp');
  let imagePath = path.join(THUMB_DIR, thumbId);
  
  // 缩略图不存在，尝试生�?
  if (!fs.existsSync(imagePath)) {
    const generated = await generateThumbnail(photoId);
    imagePath = generated?.thumbPath || path.join(PHOTO_DIR, photoId);
  }
  
  return getImageUrl(imagePath);
});

// 获取 LQIP 模糊占位图
ipcMain.handle('get-placeholder-url', async (_, photoId) => {
  if (!photoId || photoId.startsWith('data:')) return null;
  
  const placeholderId = photoId.replace(/\.[^.]+$/, '.webp');
  let imagePath = path.join(PLACEHOLDER_DIR, placeholderId);
  
  // 占位图不存在，尝试生�?
  if (!fs.existsSync(imagePath)) {
    const generated = await generatePlaceholder(photoId);
    if (!generated) return null;
    imagePath = generated.placeholderPath;
  }
  
  return getImageUrl(imagePath);
});

// 获取照片详细信息（EXIF等）
ipcMain.handle('get-photo-info', async (_, photoId) => {
  if (!photoId || photoId.startsWith('data:')) return null;
  
  const imagePath = path.join(PHOTO_DIR, photoId);
  if (!fs.existsSync(imagePath)) return null;
  
  try {
    const stats = fs.statSync(imagePath);
    const metadata = await getSharp()(imagePath).metadata();
    
    // 解析 EXIF 数据
    let exif = {};
    if (metadata.exif) {
      try {
        // sharp 返回的 exif 是 Buffer，需要解析
        const parser = getExifParser().create(fs.readFileSync(imagePath));
        const result = parser.parse();
        exif = result.tags || {};
      } catch (e) {
        // EXIF 解析失败，忽略
      }
    }
    
    return {
      // 文件信息
      fileName: photoId,
      fileSize: stats.size,
      fileDate: stats.mtime,
      
      // 图片信息
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      hasAlpha: metadata.hasAlpha,
      
      // EXIF 信息
      make: exif.Make,           // 相机品牌
      model: exif.Model,         // 相机型号
      dateTime: exif.DateTimeOriginal || exif.CreateDate,  // 拍摄时间
      exposureTime: exif.ExposureTime,    // 快门速度
      fNumber: exif.FNumber,              // 光圈
      iso: exif.ISO,                      // ISO
      focalLength: exif.FocalLength,      // 焦距
      flash: exif.Flash,                  // 闪光灯
      gpsLat: exif.GPSLatitude,           // GPS 纬度
      gpsLng: exif.GPSLongitude,          // GPS 经度
      orientation: exif.Orientation,      // 方向
    };
  } catch (e) {
    log.error('获取照片信息失败:', e);
    return null;
  }
});

// 删除照片文件
ipcMain.handle('delete-photo-file', async (_, photoId) => {
  if (!photoId || photoId.startsWith('data:')) return true;
  try {
    const photoPath = path.join(PHOTO_DIR, photoId);
    await safeDeleteFile(photoPath);
    
    // 同时删除缩略图和占位图
    const thumbId = photoId.replace(/\.[^.]+$/, '.webp');
    await safeDeleteFile(path.join(THUMB_DIR, thumbId));
    await safeDeleteFile(path.join(PLACEHOLDER_DIR, thumbId));
    return true;
  } catch { return false; }
});

ipcMain.handle('save-photo-from-base64', async (_, base64Data) => {
  ensurePhotoDir();
  try {
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return null;
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const id = getCrypto().randomUUID() + '.' + ext;
    fs.writeFileSync(path.join(PHOTO_DIR, id), Buffer.from(matches[2], 'base64'));
    
    // 异步生成缩略图和占位图
    generateThumbnail(id).catch(() => {});
    generatePlaceholder(id).catch(() => {});
    
    return { id };
  } catch { return null; }
});

// ========== 数据库操�?==========

// 获取所有标记（轻量版）
ipcMain.handle('load-markers', () => {
  const markers = getDb().getAllMarkers();
  console.log('加载标记:', markers.length, '个（数据库）');
  return markers;
});

// 获取可视区域内的标记
ipcMain.handle('get-markers-in-bounds', (_, { minLat, maxLat, minLng, maxLng }) => {
  return getDb().getMarkersInBounds(minLat, maxLat, minLng, maxLng);
});

// 获取单个标记详情（含所有照片）
ipcMain.handle('get-marker-detail', (_, markerId) => {
  return getDb().getMarkerById(markerId);
});

// 添加标记
ipcMain.handle('add-marker', (_, marker) => {
  getDb().addMarker(marker);
  return true;
});

// 更新标记
ipcMain.handle('update-marker', (_, marker) => {
  getDb().updateMarker(marker);
  return true;
});

// 删除标记
ipcMain.handle('delete-marker', async (_, markerId) => {
  // 先获取标记的照片，删除文件
  const marker = getDb().getMarkerById(markerId);
  if (marker?.photos) {
    for (const p of marker.photos) {
      if (p.id && !p.id.startsWith('data:')) {
        await safeDeleteFile(path.join(PHOTO_DIR, p.id));
        // 同时删除缩略图和占位图
        const thumbId = p.id.replace(/\.[^.]+$/, '.webp');
        await safeDeleteFile(path.join(THUMB_DIR, thumbId));
        await safeDeleteFile(path.join(PLACEHOLDER_DIR, thumbId));
      }
    }
  }
  getDb().deleteMarker(markerId);
  return true;
});

// 添加照片到标记
ipcMain.handle('add-photos-to-marker', (_, { markerId, photos }) => {
  getDb().addPhotosToMarker(markerId, photos);
  return true;
});

// 更新照片备注
ipcMain.handle('update-photo-note', (_, { markerId, photoIndex, note }) => {
  getDb().updatePhotoNote(markerId, photoIndex, note);
  return true;
});

// 批量更新照片备注
ipcMain.handle('batch-update-photo-notes', (_, { markerId, notes }) => {
  getDb().batchUpdatePhotoNotes(markerId, notes);
  return true;
});

// 安全删除文件（带重试机制，处理文件被占用的情况）
async function safeDeleteFile(filePath, maxRetries = 3, delay = 100) {
  if (!fs.existsSync(filePath)) return true;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch (e) {
      if (e.code === 'EPERM' || e.code === 'EBUSY') {
        // 文件被占用，等待后重试
        if (i < maxRetries - 1) {
          await new Promise(r => setTimeout(r, delay * (i + 1)));
          continue;
        }
        // 最后一次尝试：延迟删除
        log.warn(`文件被占用，将在下次启动时删除: ${filePath}`);
        return false;
      }
      throw e;
    }
  }
  return false;
}

// 删除照片
ipcMain.handle('delete-photo', async (_, { markerId, photoIndex, fileId }) => {
  // 先从数据库删除记录
  getDb().deletePhoto(markerId, photoIndex);
  
  // 然后尝试删除文件
  if (fileId && !fileId.startsWith('data:')) {
    const photoPath = path.join(PHOTO_DIR, fileId);
    await safeDeleteFile(photoPath);
    
    // 同时删除缩略图和占位图
    const thumbId = fileId.replace(/\.[^.]+$/, '.webp');
    await safeDeleteFile(path.join(THUMB_DIR, thumbId));
    await safeDeleteFile(path.join(PLACEHOLDER_DIR, thumbId));
  }
  return true;
});

// 搜索标记
ipcMain.handle('search-markers', (_, keyword) => {
  return getDb().searchMarkers(keyword);
});

// 搜索照片（按备注内容）
ipcMain.handle('search-photos', (_, keyword) => {
  return getDb().searchPhotos(keyword);
});

// 旋转照片
// 优化：及时释放 Buffer 和 sharp 实例
ipcMain.handle('rotate-photo', async (_, { photoId, degrees }) => {
  log.info('收到旋转请求:', { photoId, degrees });
  
  if (!photoId || photoId.startsWith('data:')) {
    log.warn('旋转照片: 无效的 photoId', photoId);
    return false;
  }
  
  let sharpInstance = null;
  let inputBuffer = null;
  let rotated = null;
  
  try {
    const photoPath = path.join(PHOTO_DIR, photoId);
    log.info('照片路径:', photoPath);
    
    if (!fs.existsSync(photoPath)) {
      log.warn('旋转照片: 文件不存在', photoPath);
      return false;
    }
    
    log.info('开始旋转照片:', photoId, degrees + '度');
    
    const sharp = getSharp();
    
    // 先读取文件到内存，避免文件锁定问题
    inputBuffer = fs.readFileSync(photoPath);
    
    // 旋转
    sharpInstance = sharp(inputBuffer);
    rotated = await sharpInstance.rotate(degrees).toBuffer();
    
    log.info('旋转完成，buffer大小:', rotated.length);
    
    // 写入临时文件，然后重命名（避免文件锁定）
    const tempPath = photoPath + '.tmp';
    fs.writeFileSync(tempPath, rotated);
    
    // 释放 Buffer 内存
    inputBuffer = null;
    rotated = null;
    
    // 删除原文件，重命名临时文件
    try { fs.unlinkSync(photoPath); } catch (e) { /* 忽略 */ }
    fs.renameSync(tempPath, photoPath);
    
    log.info('照片旋转完成，重新生成缩略图...');
    
    // 重新生成缩略图
    const thumbId = photoId.replace(/\.[^.]+$/, '.webp');
    const thumbPath = path.join(THUMB_DIR, thumbId);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    await generateThumbnail(photoId);
    
    // 重新生成占位图
    const placeholderId = photoId.replace(/\.[^.]+$/, '.webp');
    const placeholderPath = path.join(PLACEHOLDER_DIR, placeholderId);
    if (fs.existsSync(placeholderPath)) fs.unlinkSync(placeholderPath);
    await generatePlaceholder(photoId);
    
    log.info('旋转照片成功:', photoId);
    return true;
  } catch (e) {
    log.error('旋转照片失败:', e.message);
    log.error('错误堆栈:', e.stack);
    return false;
  } finally {
    // 确保释放 sharp 实例
    if (sharpInstance) {
      try { sharpInstance.destroy(); } catch {}
    }
    // 手动触发垃圾回收（如果可用）
    if (global.gc) {
      try { global.gc(); } catch {}
    }
  }
});

// 裁剪照片
// 优化：及时释放 Buffer 和 sharp 实例
ipcMain.handle('crop-photo', async (_, { photoId, crop }) => {
  log.info('收到裁剪请求:', { photoId, crop });
  
  if (!photoId || photoId.startsWith('data:')) {
    log.warn('裁剪照片: 无效的 photoId');
    return false;
  }
  
  let sharpInstance = null;
  let inputBuffer = null;
  let cropped = null;
  
  try {
    const photoPath = path.join(PHOTO_DIR, photoId);
    log.info('照片路径:', photoPath);
    
    if (!fs.existsSync(photoPath)) {
      log.warn('裁剪照片: 文件不存在', photoPath);
      return false;
    }
    
    const sharp = getSharp();
    log.info('开始裁剪:', crop);
    
    // 先读取文件到内存，避免文件锁定问题
    inputBuffer = fs.readFileSync(photoPath);
    
    // 裁剪
    sharpInstance = sharp(inputBuffer);
    cropped = await sharpInstance
      .extract({
        left: Math.round(crop.x),
        top: Math.round(crop.y),
        width: Math.round(crop.width),
        height: Math.round(crop.height)
      })
      .toBuffer();
    
    log.info('裁剪完成，buffer大小:', cropped.length);
    
    // 写入临时文件，然后重命名（避免文件锁定）
    const tempPath = photoPath + '.tmp';
    fs.writeFileSync(tempPath, cropped);
    
    // 释放 Buffer 内存
    inputBuffer = null;
    cropped = null;
    
    // 删除原文件，重命名临时文件
    try { fs.unlinkSync(photoPath); } catch (e) { /* 忽略 */ }
    fs.renameSync(tempPath, photoPath);
    
    // 重新生成缩略图
    const thumbId = photoId.replace(/\.[^.]+$/, '.webp');
    const thumbPath = path.join(THUMB_DIR, thumbId);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    await generateThumbnail(photoId);
    
    // 重新生成占位图
    const placeholderId = photoId.replace(/\.[^.]+$/, '.webp');
    const placeholderPath = path.join(PLACEHOLDER_DIR, placeholderId);
    if (fs.existsSync(placeholderPath)) fs.unlinkSync(placeholderPath);
    await generatePlaceholder(photoId);
    
    log.info('裁剪照片成功:', photoId);
    return true;
  } catch (e) {
    log.error('裁剪照片失败:', e.message);
    log.error('错误堆栈:', e.stack);
    return false;
  } finally {
    // 确保释放 sharp 实例
    if (sharpInstance) {
      try { sharpInstance.destroy(); } catch {}
    }
    // 手动触发垃圾回收（如果可用）
    if (global.gc) {
      try { global.gc(); } catch {}
    }
  }
});

// 获取统计
ipcMain.handle('get-stats', () => {
  return getDb().getStats();
});

// 兼容旧API
ipcMain.handle('save-markers', () => true); // 不再需要，数据库自动保存


// ========== 瓦片缓存 ==========

function ensureCacheDir() {
  if (!fs.existsSync(TILE_CACHE_DIR)) {
    fs.mkdirSync(TILE_CACHE_DIR, { recursive: true });
  }
}

function getTileCachePath(url) {
  const hash = getCrypto().createHash('md5').update(url).digest('hex');
  const ext = url.includes('.png') ? '.png' : url.includes('.webp') ? '.webp' : '.pbf';
  return path.join(TILE_CACHE_DIR, hash + ext);
}

ipcMain.handle('cache-tile', async (_, { url, data }) => {
  try {
    ensureCacheDir();
    fs.writeFileSync(getTileCachePath(url), Buffer.from(data, 'base64'));
    return true;
  } catch { return false; }
});

ipcMain.handle('get-cached-tile', async (_, url) => {
  try {
    const cachePath = getTileCachePath(url);
    return fs.existsSync(cachePath) ? fs.readFileSync(cachePath).toString('base64') : null;
  } catch { return null; }
});

ipcMain.handle('get-cache-stats', async () => {
  try {
    ensureCacheDir();
    const files = fs.readdirSync(TILE_CACHE_DIR);
    let totalSize = 0;
    for (const file of files) {
      totalSize += fs.statSync(path.join(TILE_CACHE_DIR, file)).size;
    }
    return { count: files.length, size: totalSize, path: TILE_CACHE_DIR };
  } catch { return { count: 0, size: 0, path: TILE_CACHE_DIR }; }
});

ipcMain.handle('clear-tile-cache', async () => {
  try {
    if (fs.existsSync(TILE_CACHE_DIR)) {
      fs.readdirSync(TILE_CACHE_DIR).forEach(file => fs.unlinkSync(path.join(TILE_CACHE_DIR, file)));
    }
    return true;
  } catch { return false; }
});

// 动态更新标题栏按钮样式
ipcMain.handle('set-titlebar-overlay', (_, options) => {
  try {
    if (mainWindow && process.platform === 'win32') {
      mainWindow.setTitleBarOverlay(options);
    }
    return true;
  } catch { return false; }
});

// ========== 日志系统 API ==========

// 渲染进程日志
ipcMain.handle('log', (_, { level, message }) => {
  switch (level) {
    case 'error': log.error('[渲染进程]', message); break;
    case 'warn': log.warn('[渲染进程]', message); break;
    case 'info': log.info('[渲染进程]', message); break;
    default: log.debug('[渲染进程]', message);
  }
});

// 获取日志文件路径
ipcMain.handle('get-log-path', () => {
  return log.transports.file.getFile().path;
});

// 打开日志文件夹
ipcMain.handle('open-log-folder', () => {
  const logPath = log.transports.file.getFile().path;
  const logDir = path.dirname(logPath);
  require('electron').shell.openPath(logDir);
  return logDir;
});

// 打开开发者工具（独立窗口）
ipcMain.handle('open-devtools', () => {
  if (mainWindow) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    return true;
  }
  return false;
});

// 获取日志内容（最近100行）
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
