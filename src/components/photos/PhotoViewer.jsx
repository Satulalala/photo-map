import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../../api/index.js';

/**
 * 照片查看器组件
 */
function PhotoViewer({ 
  photoViewer, 
  setPhotoViewer, 
  currentPhotoUrl, 
  getPhotoNote,
  markers,
  setMarkerMenu,
  refreshMarkers,
  setPhotoEditor,
  batchMode,
  selectedPhotos,
  onPhotoSelect,
  onSetCover
}) {
  const imgRef = useRef(null);
  const loadedUrlRef = useRef(null);

  useEffect(() => {
    loadedUrlRef.current = currentPhotoUrl;
    return () => {
      if (loadedUrlRef.current?.startsWith('blob:')) {
        try { URL.revokeObjectURL(loadedUrlRef.current); } catch {}
      }
    };
  }, [currentPhotoUrl]);

  const handleClose = useCallback(async () => {
    if (photoViewer.returnToMenu) {
      if (window.electronAPI?.getMarkerDetail) {
        const detail = await window.electronAPI.getMarkerDetail(photoViewer.markerId);
        if (detail) setMarkerMenu({ ...photoViewer.returnToMenu, marker: detail });
      } else {
        const marker = markers.find(m => m.id === photoViewer.markerId);
        if (marker) setMarkerMenu({ ...photoViewer.returnToMenu, marker });
      }
    }
    setPhotoViewer(null);
  }, [photoViewer, markers, setMarkerMenu, setPhotoViewer]);

  const switchPhoto = newIndex => {
    setPhotoViewer(v => ({ ...v, index: newIndex }));
  };

  const openEditor = () => {
    const photo = photoViewer.photos[photoViewer.index];
    setPhotoEditor({ photoId: photo?.id, photoUrl: currentPhotoUrl, returnToViewer: photoViewer });
    setPhotoViewer(null);
  };

  const handleDelete = async () => {
    if (!confirm('确定删除这张照片？')) return;
    const p = photoViewer.photos[photoViewer.index];
    try {
      await api.photos.delete(photoViewer.markerId, p.id);
      const np = photoViewer.photos.filter((_, i) => i !== photoViewer.index);
      if (np.length === 0) {
        // 无照片了，删除整个标记
        await api.markers.delete(photoViewer.markerId);
        setPhotoViewer(null);
      } else {
        setPhotoViewer({ ...photoViewer, photos: np, index: Math.min(photoViewer.index, np.length - 1) });
      }
      refreshMarkers();
    } catch (e) {
      console.error('删除照片失败:', e);
    }
  };

  const handleSetCover = async () => {
    const photo = photoViewer.photos[photoViewer.index];
    if (onSetCover) {
      await onSetCover(photoViewer.markerId, photo);
    }
  };

  // 批量模式网格视图
  if (batchMode) {
    return (
      <div className="photo-viewer batch-select-mode" onClick={handleClose}>
        <div className="batch-select-container" onClick={e => e.stopPropagation()}>
          <div className="batch-select-header">
            <h3>选择照片</h3>
            <button className="pv-btn pv-btn-close" onClick={handleClose}>
              <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div className="batch-select-grid">
            {photoViewer.photos.map((photo, index) => {
              const isSelected = selectedPhotos.some(
                p => p.markerId === photoViewer.markerId && p.photoId === photo.id
              );
              return (
                <div
                  key={photo.id}
                  className={`batch-select-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => onPhotoSelect(photoViewer.markerId, photo.id, index)}
                >
                  <img src={photo.url || photo.data} alt="" />
                  {isSelected && <div className="batch-select-check">✓</div>}
                  {getPhotoNote(photo) && (
                    <div className="batch-select-note">📝 {getPhotoNote(photo)}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const currentPhoto = photoViewer.photos[photoViewer.index];
  const isCover = photoViewer.photos.length > 1 && photoViewer.index !== 0;

  // 正常查看模式
  return (
    <div className="photo-viewer" onClick={handleClose}>
      {/* 工具栏 */}
      <div className="pv-toolbar" onClick={e => e.stopPropagation()}>
        {/* 编辑 */}
        <button className="pv-btn" title="编辑" onClick={openEditor}>
          <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
        </button>
        {/* 下载 */}
        <button className="pv-btn" title="下载" onClick={() => { const a = document.createElement('a'); a.download = `照片_${photoViewer.index + 1}.jpg`; a.href = currentPhotoUrl; a.click(); }}>
          <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
        </button>
        {/* 设为封面 - 只在有多张照片且不是第一张时显示 */}
        {photoViewer.photos.length > 1 && (
          <button
            className={`pv-btn ${photoViewer.index === 0 ? 'pv-btn-active' : ''}`}
            title={photoViewer.index === 0 ? '当前为封面' : '设为封面'}
            onClick={handleSetCover}
            disabled={photoViewer.index === 0}
            style={{ opacity: photoViewer.index === 0 ? 0.4 : 1 }}
          >
            <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/></svg>
          </button>
        )}
        {/* 删除 */}
        {photoViewer.photos.length > 1 && (
          <button className="pv-btn pv-btn-danger" title="删除" onClick={handleDelete}>
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        )}
        <div className="pv-divider" />
        <button className="pv-btn pv-btn-close" onClick={handleClose}>
          <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>

      {/* 图片 */}
      <div className="photo-main-wrapper" onClick={e => e.stopPropagation()}>
        <img ref={imgRef} src={currentPhotoUrl} alt="" draggable={false} />
      </div>

      {photoViewer.photos.length > 1 && (
        <>
          <button className="photo-nav prev" onClick={e => { e.stopPropagation(); switchPhoto((photoViewer.index - 1 + photoViewer.photos.length) % photoViewer.photos.length); }}>
            <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>
          <button className="photo-nav next" onClick={e => { e.stopPropagation(); switchPhoto((photoViewer.index + 1) % photoViewer.photos.length); }}>
            <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </button>
        </>
      )}

      <div className="photo-bottom-bar" onClick={e => e.stopPropagation()}>
        {photoViewer.photos.length > 1 && <div className="photo-counter">{photoViewer.index + 1} / {photoViewer.photos.length}</div>}
        {getPhotoNote(currentPhoto) && <div className="photo-note-bar">📝 {getPhotoNote(currentPhoto)}</div>}
      </div>
    </div>
  );
}

export default PhotoViewer;
