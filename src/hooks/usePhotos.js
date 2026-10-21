import { useState, useCallback, useEffect } from 'react';
import { photoUrlCache } from '../utils/LRUCache.ts';
import { getPhotoDisplayUrl, getPhotoDisplayCacheKey } from '../api/photoFileAccess.js';

export function usePhotos() {
  const [photoViewer, setPhotoViewer] = useState(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState('');
  const [photoLoadError, setPhotoLoadError] = useState(false);
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
    return getPhotoDisplayUrl(photoId, false);
  }, []);

  // 同步获取照片URL（用于已缓存的情况）
  const getPhotoUrlSync = useCallback(photo => {
    if (!photo) return '';
    if (typeof photo === 'string') return photo;
    if (photo.data && photo.data.startsWith('data:')) return photo.data;
    const photoId = photo.id;
    return photoUrlCache.get(getPhotoDisplayCacheKey(photoId)) || '';
  }, []);

  // 获取照片备注
  const getPhotoNote = useCallback(
    photo => (typeof photo === 'string' ? '' : photo?.note || ''),
    []
  );

  // 加载当前查看的照片
  useEffect(() => {
    let active = true;
    let idleTask;
    let preloadTimer;
    setCurrentPhotoUrl('');
    setPhotoLoadError(false);
    if (photoViewer && photoViewer.photos[photoViewer.index]) {
      getPhotoUrl(photoViewer.photos[photoViewer.index])
        .then(url => {
          if (active) {
            setCurrentPhotoUrl(url || '');
            setPhotoLoadError(!url);
          }
        })
        .catch(() => {
          if (active) {
            setCurrentPhotoUrl('');
            setPhotoLoadError(true);
          }
        });

      // 空闲时预加载相邻照片
      const preloadNext = () => {
        if (!active) return;
        const { photos, index } = photoViewer;
        const preloadIndexes = [index + 1, index - 1].filter(i => i >= 0 && i < photos.length);
        preloadIndexes.forEach(i => {
          getPhotoUrl(photos[i])
            .then(url => {
              if (active && url) {
                const img = new Image();
                img.src = url;
              }
            })
            .catch(() => {});
        });
      };

      // 使用 requestIdleCallback 在空闲时预加载
      if ('requestIdleCallback' in window) {
        idleTask = requestIdleCallback(preloadNext, { timeout: 1000 });
      } else {
        preloadTimer = setTimeout(preloadNext, 100);
      }
    } else {
      setCurrentPhotoUrl('');
      setPhotoInfo(null);
    }
    return () => {
      active = false;
      if (idleTask !== undefined) window.cancelIdleCallback?.(idleTask);
      clearTimeout(preloadTimer);
    };
  }, [photoViewer, getPhotoUrl]);

  // 加载当前照片的详细信息
  useEffect(() => {
    let active = true;
    setPhotoInfo(null);
    if (photoViewer && photoViewer.photos[photoViewer.index]) {
      const photo = photoViewer.photos[photoViewer.index];
      if (photo?.id && window.electronAPI?.getPhotoInfo) {
        window.electronAPI
          .getPhotoInfo(photo.id)
          .then(info => {
            if (active) setPhotoInfo(info);
          })
          .catch(() => {
            if (active) setPhotoInfo(null);
          });
      } else {
        setPhotoInfo(null);
      }
    }
    return () => {
      active = false;
    };
  }, [photoViewer?.index, photoViewer?.photos]);

  return {
    photoViewer,
    currentPhotoUrl,
    photoLoadError,
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
