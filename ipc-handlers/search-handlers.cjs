// ========== 搜索与照片处理 IPC 处理器 ==========
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

module.exports = function registerSearchHandlers(ctx) {
  const { getDb, getSharp, PHOTO_DIR, THUMB_DIR, PLACEHOLDER_DIR, generateThumbnail, generatePlaceholder, log } = ctx;

  ipcMain.handle('search-markers', (_, keyword) => {
    return getDb().searchMarkers(keyword);
  });

  ipcMain.handle('search-photos', (_, keyword) => {
    return getDb().searchPhotos(keyword);
  });

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
      if (!fs.existsSync(photoPath)) {
        log.warn('旋转照片: 文件不存在', photoPath);
        return false;
      }

      const sharp = getSharp();
      inputBuffer = fs.readFileSync(photoPath);
      sharpInstance = sharp(inputBuffer);
      rotated = await sharpInstance.rotate(degrees).toBuffer();

      const tempPath = photoPath + '.tmp';
      fs.writeFileSync(tempPath, rotated);
      inputBuffer = null;
      rotated = null;

      try { fs.unlinkSync(photoPath); } catch {}
      fs.renameSync(tempPath, photoPath);

      const thumbId = photoId.replace(/\.[^.]+$/, '.webp');
      const thumbPath = path.join(THUMB_DIR, thumbId);
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
      await generateThumbnail(photoId);

      const placeholderId = photoId.replace(/\.[^.]+$/, '.webp');
      const placeholderPath = path.join(PLACEHOLDER_DIR, placeholderId);
      if (fs.existsSync(placeholderPath)) fs.unlinkSync(placeholderPath);
      await generatePlaceholder(photoId);

      log.info('旋转照片成功:', photoId);
      return true;
    } catch (e) {
      log.error('旋转照片失败:', e.message);
      return false;
    } finally {
      if (sharpInstance) { try { sharpInstance.destroy(); } catch {} }
      if (global.gc) { try { global.gc(); } catch {} }
    }
  });

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
      if (!fs.existsSync(photoPath)) {
        log.warn('裁剪照片: 文件不存在', photoPath);
        return false;
      }

      const sharp = getSharp();
      inputBuffer = fs.readFileSync(photoPath);
      sharpInstance = sharp(inputBuffer);
      cropped = await sharpInstance
        .extract({
          left: Math.round(crop.x),
          top: Math.round(crop.y),
          width: Math.round(crop.width),
          height: Math.round(crop.height)
        })
        .toBuffer();

      const tempPath = photoPath + '.tmp';
      fs.writeFileSync(tempPath, cropped);
      inputBuffer = null;
      cropped = null;

      try { fs.unlinkSync(photoPath); } catch {}
      fs.renameSync(tempPath, photoPath);

      const thumbId = photoId.replace(/\.[^.]+$/, '.webp');
      const thumbPath = path.join(THUMB_DIR, thumbId);
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
      await generateThumbnail(photoId);

      const placeholderId = photoId.replace(/\.[^.]+$/, '.webp');
      const placeholderPath = path.join(PLACEHOLDER_DIR, placeholderId);
      if (fs.existsSync(placeholderPath)) fs.unlinkSync(placeholderPath);
      await generatePlaceholder(photoId);

      log.info('裁剪照片成功:', photoId);
      return true;
    } catch (e) {
      log.error('裁剪照片失败:', e.message);
      return false;
    } finally {
      if (sharpInstance) { try { sharpInstance.destroy(); } catch {} }
      if (global.gc) { try { global.gc(); } catch {} }
    }
  });
};
