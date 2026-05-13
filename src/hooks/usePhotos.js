import { useState, useCallback, useEffect } from 'react';
import { photoUrlCache } from '../utils/LRUCache.ts';

export function usePhotos() {
  const [photoViewer, setPhotoViewer] = useState(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState('');
  const [photoInfo, setPhotoInfo] = useState(null);
  const [photoEditor, setPhotoEditor] = useState(null);
  const [noteEditor, setNoteEditor] = useState(null);
  const [notesPanel, setNotesPanel] = useState(null);

  const getPhotoUrl = useCallback(async photo => {
    if (!photo) return null;
    // 旧格式：直接是base64字符串
    if (typeof photo === 'string') return photo;
    // 旧格式：photo.data 是 base64
    if (photo.data && photo.data.startsWith('data:')) return photo.data;
    // 新格式：photo.id 是文件名
    const photoId = photo.id;
    if (!photoId) return null;
    // 检查 LRU 缓存
    const cached = photoUrlCache.get(photoId);
    if (cached) return cached;
    // 从文件获取URL
    if (window.electronAPI) {
      const url = await window.electronAPI.getPhotoUrl(photoId);
      if (url) photoUrlCache.set(photoId, url);
      return url;
    }
    return null;
  }, []);

  // 同步获取照片URL（用于已缓存的情况）
  const getPhotoUrlSync = useCallback(photo => {
    if (!photo) return '';
    if (typeof photo === 'string') return photo;
    if (photo.data && photo.data.startsWith('data:')) return photo.data;
    const photoId = photo.id;
    return photoUrlCache.get(photoId) || '';
  }, []);

  // 获取照片备注
  const getPhotoNote = useCallback(photo => typeof photo === 'string' ? '' : (photo.note || ''), []);

  // 加载当前查看的照片
  useEffect(() => {
    if (photoViewer && photoViewer.photos[photoViewer.index]) {
      getPhotoUrl(photoViewer.photos[photoViewer.index]).then(url => {
        setCurrentPhotoUrl(url || '');
      });

      // 空闲时预加载相邻照片
      const preloadNext = () => {
        const { photos, index } = photoViewer;
        const preloadIndexes = [index + 1, index - 1].filter(i => i >= 0 && i < photos.length);
        preloadIndexes.forEach(i => {
          getPhotoUrl(photos[i]).then(url => {
            if (url) {
              const img = new Image();
              img.src = url;
            }
          });
        });
      };

      // 使用 requestIdleCallback 在空闲时预加载
      if ('requestIdleCallback' in window) {
        requestIdleCallback(preloadNext, { timeout: 1000 });
      } else {
        setTimeout(preloadNext, 100);
      }
    } else {
      setCurrentPhotoUrl('');
      setPhotoInfo(null);
    }
  }, [photoViewer, getPhotoUrl]);

  // 加载当前照片的详细信息
  useEffect(() => {
    if (photoViewer && photoViewer.photos[photoViewer.index]) {
      const photo = photoViewer.photos[photoViewer.index];
      if (photo?.id && window.electronAPI?.getPhotoInfo) {
        window.electronAPI.getPhotoInfo(photo.id).then(info => {
          setPhotoInfo(info);
        });
      } else {
        setPhotoInfo(null);
      }
    }
  }, [photoViewer?.index, photoViewer?.photos]);

  return {
    photoViewer,
    currentPhotoUrl,
    photoInfo,
    photoEditor,
    noteEditor,
    notesPanel,
    getPhotoUrl,
    getPhotoUrlSync,
    getPhotoNote,
    setPhotoViewer,
    setCurrentPhotoUrl,
    setPhotoInfo,
    setPhotoEditor,
    setNoteEditor,
    setNotesPanel,
  };
}
