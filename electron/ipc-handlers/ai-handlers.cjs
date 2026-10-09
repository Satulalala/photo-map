// ========== 语义搜索（AI 向量搜索）IPC 处理器 ==========
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

module.exports = function registerAiHandlers(ctx) {
  const { getDb, getEmbedding, PHOTO_DIR, log } = ctx;
  let indexingPromise = null;
  const ensurePhotoIndex = () => {
    if (indexingPromise) return indexingPromise;
    indexingPromise = (async () => {
      const db = getDb();
      for (const marker of db.getAllMarkers()) {
        for (const photo of db.getMarkerById(marker.id)?.photos || []) {
          if (!photo.id || photo.id.startsWith('data:') || db.hasPhotoEmbedding(photo.id)) continue;
          const photoPath = path.join(PHOTO_DIR, photo.id);
          if (!fs.existsSync(photoPath)) continue;
          const vector = await getEmbedding().getImageEmbedding(photoPath);
          if (!vector) throw new Error('照片搜索索引生成失败，请检查模型加载状态');
          // A photo may have been deleted during inference.
          if (db.getMarkerById(marker.id)?.photos?.some(p => p.id === photo.id)) {
            db.addPhotoEmbedding(photo.id, marker.id, Array.from(vector));
          }
        }
      }
    })().finally(() => { indexingPromise = null; });
    return indexingPromise;
  };

  ipcMain.handle('search-photos-by-content', async (_, { text, topK }) => {
    if (!text || !text.trim()) return [];

    try {
      const start = Date.now();
      const embedding = getEmbedding();
      const status = embedding.getStatus();
      if (!status.isLoaded) {
        throw new Error(status.error || '图片描述搜索模型正在加载，请等待下载完成后重试');
      }
      const textVec = await embedding.getTextEmbedding(text.trim());
      if (!textVec) throw new Error('图片描述编码失败，请重试');
      await ensurePhotoIndex();

      log.info(`[语义搜索] 查询 "${text}" 耗时 ${Date.now() - start}ms`);

      const db = getDb();
      const results = db.searchByEmbedding(Array.from(textVec), topK || 20);

      const enriched = results.map(r => {
        const marker = db.getMarkerById(r.markerId);
        const photoInfo = marker?.photos?.find(p => p.id === r.photoId);
        return {
          photoId: r.photoId,
          markerId: r.markerId,
          score: r.score,
          note: photoInfo?.note || '',
          markerName: marker?.name || '',
          lat: marker?.lat || 0,
          lng: marker?.lng || 0,
        };
      });

      return enriched.filter(r => r.markerName || r.lat);
    } catch (e) {
      log.error('[语义搜索] 失败:', e.message);
      throw e;
    }
  });

  ipcMain.handle('generate-photo-embedding', async (_, { photoId, markerId }) => {
    try {
      const photoPath = path.join(PHOTO_DIR, photoId);
      if (!fs.existsSync(photoPath)) {
        log.warn('[Embedding] 照片文件不存在，跳过:', photoPath);
        return false;
      }

      const embedding = getEmbedding();
      const vec = await embedding.getImageEmbedding(photoPath);
      if (!vec) return false;

      getDb().addPhotoEmbedding(photoId, markerId, Array.from(vec));
      log.info('[Embedding] 已生成:', photoId);
      return true;
    } catch (e) {
      log.error('[Embedding] 生成失败:', e.message);
      return false;
    }
  });

  ipcMain.handle('batch-generate-embeddings', async () => {
    try {
      const db = getDb();
      const markers = db.getAllMarkers();
      let count = 0;

      for (const marker of markers) {
        const detail = db.getMarkerById(marker.id);
        if (!detail?.photos) continue;

        for (const photo of detail.photos) {
          if (!photo.id || photo.id.startsWith('data:')) continue;

          const photoPath = path.join(PHOTO_DIR, photo.id);
          if (!fs.existsSync(photoPath)) continue;

          const embedding = getEmbedding();
          const vec = await embedding.getImageEmbedding(photoPath);
          if (!vec) continue;

          db.addPhotoEmbedding(photo.id, marker.id, Array.from(vec));
          count++;
        }
      }

      log.info(`[Embedding] 批量完成: ${count} 张照片`);
      return { count };
    } catch (e) {
      log.error('[Embedding] 批量失败:', e.message);
      return { count: 0, error: e.message };
    }
  });

  ipcMain.handle('get-embedding-status', () => {
    return getEmbedding().getStatus();
  });

  ipcMain.handle('get-stats', () => {
    return getDb().getStats();
  });

  ipcMain.handle('save-markers', () => true);
};
