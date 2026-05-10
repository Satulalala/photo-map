// ========== 瓦片缓存 IPC 处理器 ==========
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

module.exports = function registerCacheHandlers(ctx) {
  const { getCrypto, TILE_CACHE_DIR } = ctx;

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
};
