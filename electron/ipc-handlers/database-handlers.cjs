// ========== 数据库操作 IPC 处理器 ==========
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

module.exports = function registerDatabaseHandlers(ctx) {
  const { getDb, getEmbedding, PHOTO_DIR, THUMB_DIR, PLACEHOLDER_DIR, safeDeleteFile, log } = ctx;

  ipcMain.handle('load-markers', () => {
    const markers = getDb().getAllMarkers();
    console.log('加载标记:', markers.length, '个（数据库）');
    return markers;
  });

  ipcMain.handle('get-markers-in-bounds', (_, { minLat, maxLat, minLng, maxLng }) => {
    return getDb().getMarkersInBounds(minLat, maxLat, minLng, maxLng);
  });

  ipcMain.handle('get-marker-detail', (_, markerId) => {
    return getDb().getMarkerById(markerId);
  });

  ipcMain.handle('add-marker', (_, marker) => {
    getDb().addMarker(marker);
    return true;
  });

  ipcMain.handle('get-photos', (_, markerId) => {
    const detail = getDb().getMarkerById(markerId);
    return detail?.photos || [];
  });

  ipcMain.handle('update-marker', (_, marker) => {
    getDb().updateMarker(marker);
    return true;
  });

  ipcMain.handle('delete-marker', async (_, markerId) => {
    const marker = getDb().getMarkerById(markerId);
    if (marker?.photos) {
      for (const p of marker.photos) {
        if (p.id && !p.id.startsWith('data:')) {
          await safeDeleteFile(path.join(PHOTO_DIR, p.id));
          const thumbId = p.id.replace(/\.[^.]+$/, '.webp');
          await safeDeleteFile(path.join(THUMB_DIR, thumbId));
          await safeDeleteFile(path.join(PLACEHOLDER_DIR, thumbId));
        }
      }
    }
    getDb().deleteMarker(markerId);
    return true;
  });

  ipcMain.handle('add-photos-to-marker', (_, { markerId, photos }) => {
    getDb().addPhotosToMarker(markerId, photos);

    if (photos && photos.length > 0) {
      setImmediate(async () => {
        try {
          const embedding = getEmbedding();
          const status = embedding.getStatus();
          if (!status.isLoaded && !status.isLoading) {
            log.info('[Embedding] 模型未加载，跳过 embedding 生成');
            return;
          }

          let count = 0;
          for (const photo of photos) {
            if (!photo.id || photo.id.startsWith('data:')) continue;
            const photoPath = path.join(PHOTO_DIR, photo.id);
            if (!fs.existsSync(photoPath)) continue;

            const vec = await embedding.getImageEmbedding(photoPath);
            if (vec) {
              getDb().addPhotoEmbedding(photo.id, markerId, Array.from(vec));
              count++;
            }
          }
          log.info(`[Embedding] 为 ${markerId} 生成了 ${count} 个 embedding`);
        } catch (e) {
          log.warn('[Embedding] 异步生成失败:', e.message);
        }
      });
    }

    return true;
  });

  ipcMain.handle('update-photo-note', (_, { markerId, photoIndex, note }) => {
    getDb().updatePhotoNote(markerId, photoIndex, note);
    return true;
  });

  ipcMain.handle('batch-update-photo-notes', (_, { markerId, notes }) => {
    getDb().batchUpdatePhotoNotes(markerId, notes);
    return true;
  });

  ipcMain.handle('delete-photo', async (_, { markerId, photoIndex, fileId }) => {
    getDb().deletePhoto(markerId, photoIndex);

    if (fileId && !fileId.startsWith('data:')) {
      try { getDb().removePhotoEmbedding(fileId); } catch {}
    }

    if (fileId && !fileId.startsWith('data:')) {
      const photoPath = path.join(PHOTO_DIR, fileId);
      await safeDeleteFile(photoPath);

      const thumbId = fileId.replace(/\.[^.]+$/, '.webp');
      await safeDeleteFile(path.join(THUMB_DIR, thumbId));
      await safeDeleteFile(path.join(PLACEHOLDER_DIR, thumbId));
    }
    return true;
  });
};
