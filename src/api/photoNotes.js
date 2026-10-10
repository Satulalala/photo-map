import { photosApi } from './markers.js';
import { isElectron } from './utils.js';

export async function savePhotoNotes(markerId, photos, notes) {
  const updatedNotes = photos.map((_, index) => notes[index] || '');
  if (isElectron()) {
    // 桌面端按照片顺序在同一事务中保存，包含旧格式照片。
    const saved = await window.electronAPI.batchUpdatePhotoNotes(markerId, updatedNotes);
    if (!saved) throw new Error('照片备注保存失败');
    return;
  }
  for (let index = 0; index < photos.length; index++) {
    await photosApi.update(markerId, photos[index].id, { note: updatedNotes[index] });
  }
}
