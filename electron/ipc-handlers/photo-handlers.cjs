// ========== 照片文件管理 IPC 处理器 ==========
const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

module.exports = function registerPhotoHandlers(ctx) {
  const { getMainWindow, getCrypto, getSharp, getExifParser, PHOTO_DIR, THUMB_DIR, PLACEHOLDER_DIR, ensurePhotoDir, generateThumbnail, generatePlaceholder, getImageUrl, safeDeleteFile, log } = ctx;

  ipcMain.handle('select-photos', async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
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

      fs.copyFileSync(filePath, destPath);

      generateThumbnail(id).catch(() => {});
      generatePlaceholder(id).catch(() => {});

      photos.push({ id });
    }

    return photos;
  });

  ipcMain.handle('get-photo-url', (_, photoId) => {
    if (photoId?.startsWith('data:')) return photoId;
    return getImageUrl(path.join(PHOTO_DIR, photoId));
  });

  ipcMain.handle('get-thumbnail-url', async (_, photoId) => {
    if (!photoId || photoId.startsWith('data:')) return photoId;

    const thumbId = photoId.replace(/\.[^.]+$/, '.webp');
    let imagePath = path.join(THUMB_DIR, thumbId);

    if (!fs.existsSync(imagePath)) {
      const generated = await generateThumbnail(photoId);
      imagePath = generated?.thumbPath || path.join(PHOTO_DIR, photoId);
    }

    return getImageUrl(imagePath);
  });

  ipcMain.handle('get-placeholder-url', async (_, photoId) => {
    if (!photoId || photoId.startsWith('data:')) return null;

    const placeholderId = photoId.replace(/\.[^.]+$/, '.webp');
    let imagePath = path.join(PLACEHOLDER_DIR, placeholderId);

    if (!fs.existsSync(imagePath)) {
      const generated = await generatePlaceholder(photoId);
      if (!generated) return null;
      imagePath = generated.placeholderPath;
    }

    return getImageUrl(imagePath);
  });

  ipcMain.handle('get-photo-info', async (_, photoId) => {
    if (!photoId || photoId.startsWith('data:')) return null;

    const imagePath = path.join(PHOTO_DIR, photoId);
    if (!fs.existsSync(imagePath)) return null;

    try {
      const stats = fs.statSync(imagePath);
      const metadata = await getSharp()(imagePath).metadata();

      let exif = {};
      if (metadata.exif) {
        try {
          const parser = getExifParser().create(fs.readFileSync(imagePath));
          const result = parser.parse();
          exif = result.tags || {};
        } catch {}
      }

      return {
        fileName: photoId,
        fileSize: stats.size,
        fileDate: stats.mtime,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        hasAlpha: metadata.hasAlpha,
        make: exif.Make,
        model: exif.Model,
        dateTime: exif.DateTimeOriginal || exif.CreateDate,
        exposureTime: exif.ExposureTime,
        fNumber: exif.FNumber,
        iso: exif.ISO,
        focalLength: exif.FocalLength,
        flash: exif.Flash,
        gpsLat: exif.GPSLatitude,
        gpsLng: exif.GPSLongitude,
        orientation: exif.Orientation,
      };
    } catch (e) {
      log.error('获取照片信息失败:', e);
      return null;
    }
  });

  ipcMain.handle('delete-photo-file', async (_, photoId) => {
    if (!photoId || photoId.startsWith('data:')) return true;
    try {
      const photoPath = path.join(PHOTO_DIR, photoId);
      await safeDeleteFile(photoPath);

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

      generateThumbnail(id).catch(() => {});
      generatePlaceholder(id).catch(() => {});

      return { id };
    } catch { return null; }
  });
};
