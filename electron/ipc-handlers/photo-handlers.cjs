// ========== 照片文件管理 IPC 处理器 ==========
const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

module.exports = function registerPhotoHandlers(ctx) {
  const { getMainWindow, getCrypto, getSharp, getExifParser, getStoragePaths, ensurePhotoDir, generateThumbnail, generatePlaceholder, getImageUrl, safeDeleteFile, log } = ctx;
  const resolvePhotoPath = (directory, photoId) => {
    if (typeof photoId !== 'string' || !photoId || photoId === '.' || photoId === '..' ||
        photoId.length > 255 || path.basename(photoId) !== photoId || /[\\/\0]/.test(photoId)) return null;
    const root = path.resolve(directory);
    const target = path.resolve(root, photoId);
    const relative = path.relative(root, target);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? target : null;
  };

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
      const destPath = path.join(getStoragePaths().PHOTO_DIR, id);

      fs.copyFileSync(filePath, destPath);

      generateThumbnail(id).catch(() => {});
      generatePlaceholder(id).catch(() => {});

      photos.push({ id });
    }

    return photos;
  });

  ipcMain.handle('get-photo-url', (_, photoId) => {
    if (photoId?.startsWith('data:')) return photoId;
    const photoPath = resolvePhotoPath(getStoragePaths().PHOTO_DIR, photoId);
    return photoPath && fs.existsSync(photoPath) ? getImageUrl(photoPath) : null;
  });

  ipcMain.handle('get-thumbnail-url', async (_, photoId) => {
    if (!photoId || photoId.startsWith('data:')) return photoId;

    const thumbId = photoId.replace(/\.[^.]+$/, '.webp');
    const photoPath = resolvePhotoPath(getStoragePaths().PHOTO_DIR, photoId);
    if (!photoPath || !fs.existsSync(photoPath)) return null;
    let imagePath = path.join(getStoragePaths().THUMB_DIR, thumbId);

    if (!fs.existsSync(imagePath)) {
      const generated = await generateThumbnail(photoId);
      imagePath = generated?.thumbPath || photoPath;
    }

    return getImageUrl(imagePath);
  });

  ipcMain.handle('get-placeholder-url', async (_, photoId) => {
    if (!photoId || photoId.startsWith('data:')) return null;

    const placeholderId = photoId.replace(/\.[^.]+$/, '.webp');
    const photoPath = resolvePhotoPath(getStoragePaths().PHOTO_DIR, photoId);
    if (!photoPath || !fs.existsSync(photoPath)) return null;
    let imagePath = path.join(getStoragePaths().PLACEHOLDER_DIR, placeholderId);

    if (!fs.existsSync(imagePath)) {
      const generated = await generatePlaceholder(photoId);
      if (!generated) return null;
      imagePath = generated.placeholderPath;
    }

    return getImageUrl(imagePath);
  });

  ipcMain.handle('get-photo-info', async (_, photoId) => {
    if (!photoId || photoId.startsWith('data:')) return null;

    const imagePath = resolvePhotoPath(getStoragePaths().PHOTO_DIR, photoId);
    if (!imagePath || !fs.existsSync(imagePath)) return null;
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
      const photoPath = resolvePhotoPath(getStoragePaths().PHOTO_DIR, photoId);
      if (!photoPath) return false;
      await safeDeleteFile(photoPath);

      const thumbId = photoId.replace(/\.[^.]+$/, '.webp');
      await safeDeleteFile(path.join(getStoragePaths().THUMB_DIR, thumbId));
      await safeDeleteFile(path.join(getStoragePaths().PLACEHOLDER_DIR, thumbId));
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
      fs.writeFileSync(path.join(getStoragePaths().PHOTO_DIR, id), Buffer.from(matches[2], 'base64'));

      generateThumbnail(id).catch(() => {});
      generatePlaceholder(id).catch(() => {});

      return { id };
    } catch { return null; }
  });

  ipcMain.handle('read-photo-file', async (_, photoId) => {
    const photoPath = resolvePhotoPath(getStoragePaths().PHOTO_DIR, photoId);
    if (!photoPath || !fs.existsSync(photoPath)) return null;
    try {
      const bytes = fs.readFileSync(photoPath);
      return { bytes: Uint8Array.from(bytes), fileName: path.basename(photoPath) };
    } catch { return null; }
  });

  ipcMain.handle('read-thumbnail-file', async (_, photoId) => {
    const thumbId = typeof photoId === 'string' ? photoId.replace(/\.[^.]+$/, '.webp') : '';
    const thumbPath = resolvePhotoPath(getStoragePaths().THUMB_DIR, thumbId);
    if (!thumbPath) return null;
    if (!fs.existsSync(thumbPath)) await generateThumbnail(photoId);
    if (!fs.existsSync(thumbPath)) return null;
    try {
      return { bytes: Uint8Array.from(fs.readFileSync(thumbPath)), fileName: thumbId };
    } catch { return null; }
  });

  ipcMain.handle('save-photo-file', async (_, { photoId, bytes }) => {
    ensurePhotoDir();
    const photoPath = resolvePhotoPath(getStoragePaths().PHOTO_DIR, photoId);
    if (!photoPath || !(bytes instanceof ArrayBuffer || ArrayBuffer.isView(bytes))) return false;
    try {
      fs.writeFileSync(photoPath, Buffer.from(bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes));
      generateThumbnail(photoId).catch(() => {});
      generatePlaceholder(photoId).catch(() => {});
      return true;
    } catch { return false; }
  });

  ipcMain.handle('save-thumbnail-file', async (_, { photoId, bytes }) => {
    ensurePhotoDir();
    const thumbId = typeof photoId === 'string' ? photoId.replace(/\.[^.]+$/, '.webp') : '';
    const thumbPath = resolvePhotoPath(getStoragePaths().THUMB_DIR, thumbId);
    if (!thumbPath || !(bytes instanceof ArrayBuffer || ArrayBuffer.isView(bytes))) return false;
    try {
      fs.writeFileSync(thumbPath, Buffer.from(bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes));
      return true;
    } catch { return false; }
  });
};
