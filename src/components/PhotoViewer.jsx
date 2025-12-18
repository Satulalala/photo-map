import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * 照片查看器组件
 * - 查看照片
 * - 点击编辑按钮进入编辑模式（裁剪+旋转）
 */
function PhotoViewer({ 
  photoViewer, 
  setPhotoViewer, 
  currentPhotoUrl, 
  getPhotoNote,
  markers,
  setMarkerMenu,
  refreshMarkers,
  setPhotoEditor
}) {
  const imgRef = useRef(null);
  const loadedUrlRef = useRef(null);

  // 组件卸载时清理
  useEffect(() => {
    // 记录当前加载的 URL
    loadedUrlRef.current = currentPhotoUrl;
    
    return () => {
      // 卸载时释放 Blob URL
      if (loadedUrlRef.current?.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(loadedUrlRef.current);
        } catch {}
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

  const switchPhoto = (newIndex) => {
    setPhotoViewer(v => ({ ...v, index: newIndex }));
  };

  // 打开编辑器
  const openEditor = () => {
    const photo = photoViewer.photos[photoViewer.index];
    setPhotoEditor({
      photoId: photo?.id,
      photoUrl: currentPhotoUrl,
      returnToViewer: photoViewer
    });
    setPhotoViewer(null);
  };

  return (
    <div className="photo-viewer" onClick={handleClose}>
      {/* 工具栏 */}
      <div className="pv-toolbar" onClick={e => e.stopPropagation()}>
        {/* 编辑按钮 - 集成裁剪和旋转 */}
        <button className="pv-btn" onClick={openEditor} title="编辑（裁剪/旋转）">
          <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
        </button>
        <button className="pv-btn" onClick={() => { const a = document.createElement('a'); a.download = `照片_${photoViewer.index + 1}.jpg`; a.href = currentPhotoUrl; a.click(); }} title="下载原图">
          <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
        </button>
        {photoViewer.photos.length > 1 && (
          <button className="pv-btn pv-btn-danger" onClick={async () => {
            if (!confirm('确定删除？')) return;
            const p = photoViewer.photos[photoViewer.index];
            if (window.electronAPI) await window.electronAPI.deletePhoto(photoViewer.markerId, photoViewer.index, p?.id);
            const np = photoViewer.photos.filter((_, i) => i !== photoViewer.index);
            setPhotoViewer({ ...photoViewer, photos: np, index: Math.min(photoViewer.index, np.length - 1) });
            refreshMarkers();
          }} title="删除">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        )}
        <div className="pv-divider"></div>
        <button className="pv-btn pv-btn-close" onClick={handleClose} title="关闭">
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
        {getPhotoNote(photoViewer.photos[photoViewer.index]) && <div className="photo-note-bar">📝 {getPhotoNote(photoViewer.photos[photoViewer.index])}</div>}
      </div>
    </div>
  );
}

export default PhotoViewer;
