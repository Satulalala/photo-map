import { useState, useCallback, useRef } from 'react';
import api from '../../api/index.js';
import MapIcon from '../map/MapIcon.jsx';
import { useDialogFocus } from '../../hooks/useDialogFocus.js';

function ViewerButton({ icon, label, ...props }) {
  return (
    <button type="button" className="pv-btn" title={label} aria-label={label} {...props}>
      <MapIcon name={icon} />
    </button>
  );
}

export default function PhotoViewer({
  photoViewer,
  setPhotoViewer,
  currentPhotoUrl,
  photoLoadError,
  getPhotoNote,
  markers,
  setMarkerMenu,
  refreshMarkers,
  setPhotoEditor,
  batchMode,
  selectedPhotos = [],
  onPhotoSelect,
  onSetCover,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const currentPhoto = photoViewer.photos[photoViewer.index];

  // The photo loader owns this URL; changing views must not revoke it.
  const handleClose = useCallback(async () => {
    if (pending.current) return;
    if (photoViewer.returnToMenu) {
      try {
        const detail = window.electronAPI?.getMarkerDetail
          ? await window.electronAPI.getMarkerDetail(photoViewer.markerId)
          : markers.find(marker => marker.id === photoViewer.markerId);
        if (detail) setMarkerMenu({ ...photoViewer.returnToMenu, marker: detail });
      } catch {
        setError('无法恢复地点详情，请稍后重试。');
        return;
      }
    }
    setPhotoViewer(null);
  }, [photoViewer, markers, setMarkerMenu, setPhotoViewer]);
  useDialogFocus(true, '.photo-viewer', handleClose);

  const switchPhoto = direction => {
    if (pending.current) return;
    setError('');
    setPhotoViewer(value => ({
      ...value,
      index: (value.index + direction + value.photos.length) % value.photos.length,
    }));
  };

  const perform = async action => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch {
      setError('操作失败，请重试。');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const handleDelete = () => {
    if (pending.current || !confirm('确定删除这张照片？')) return;
    void perform(async () => {
      await api.photos.delete(photoViewer.markerId, currentPhoto.id);
      const photos = photoViewer.photos.filter((_, index) => index !== photoViewer.index);
      setPhotoViewer({
        ...photoViewer,
        photos,
        index: Math.min(photoViewer.index, photos.length - 1),
      });
      await refreshMarkers();
    });
  };

  return (
    <div
      className={`photo-viewer ${batchMode ? 'batch-select-mode' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={batchMode ? '选择照片' : '照片查看器'}
      aria-busy={busy}
      tabIndex={-1}
      onClick={handleClose}
      onKeyDown={event => {
        if (batchMode || /INPUT|TEXTAREA/.test(event.target.tagName)) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          switchPhoto(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
    >
      {batchMode ? (
        <div className="batch-select-container" onClick={event => event.stopPropagation()}>
          <div className="batch-select-header">
            <h3>选择照片</h3>
            <ViewerButton icon="close" label="关闭照片选择" onClick={handleClose} />
          </div>
          <div className="batch-select-grid">
            {photoViewer.photos.map((photo, index) => {
              const selected = selectedPhotos.some(
                item => item.markerId === photoViewer.markerId && item.photoId === photo.id
              );
              return (
                <button
                  type="button"
                  key={photo.id}
                  className={`batch-select-item ${selected ? 'selected' : ''}`}
                  aria-pressed={selected}
                  aria-label={`选择照片 ${index + 1}`}
                  onClick={() => onPhotoSelect(photoViewer.markerId, photo.id, index)}
                >
                  <img src={photo.url || photo.data} alt={`照片 ${index + 1}`} />
                  {selected && (
                    <span className="batch-select-check">
                      <MapIcon name="check" />
                    </span>
                  )}
                  {getPhotoNote(photo) && (
                    <span className="batch-select-note">{getPhotoNote(photo)}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="pv-toolbar" onClick={event => event.stopPropagation()}>
            <ViewerButton
              icon="edit"
              label="编辑照片"
              disabled={busy || !currentPhotoUrl}
              onClick={() => {
                setPhotoEditor({
                  photoId: currentPhoto?.id,
                  photoUrl: currentPhotoUrl,
                  returnToViewer: photoViewer,
                });
                setPhotoViewer(null);
              }}
            />
            <ViewerButton
              icon="download"
              label="下载照片"
              disabled={busy || !currentPhotoUrl}
              onClick={() => {
                const link = document.createElement('a');
                link.download = `照片_${photoViewer.index + 1}.jpg`;
                link.href = currentPhotoUrl;
                link.click();
              }}
            />
            {photoViewer.photos.length > 1 && (
              <>
                <ViewerButton
                  icon="star"
                  label={photoViewer.index === 0 ? '当前为封面' : '设为封面'}
                  aria-pressed={photoViewer.index === 0}
                  disabled={busy || photoViewer.index === 0 || !onSetCover}
                  onClick={() => perform(() => onSetCover(photoViewer.markerId, currentPhoto))}
                />
                <ViewerButton
                  icon="trash"
                  label="删除照片"
                  className="pv-btn pv-btn-danger"
                  disabled={busy}
                  onClick={handleDelete}
                />
              </>
            )}
            <div className="pv-divider" />
            <ViewerButton
              icon="close"
              label="关闭照片查看器"
              disabled={busy}
              onClick={handleClose}
            />
          </div>
          <div className="photo-main-wrapper" onClick={event => event.stopPropagation()}>
            {currentPhotoUrl ? (
              <img
                src={currentPhotoUrl}
                alt={getPhotoNote(currentPhoto) || `照片 ${photoViewer.index + 1}`}
                draggable={false}
              />
            ) : photoLoadError ? (
              <div>
                <p role="alert">照片加载失败</p>
                <button type="button" onClick={() => setPhotoViewer(value => ({ ...value }))}>
                  重新加载
                </button>
              </div>
            ) : (
              <p role="status">正在加载照片…</p>
            )}
          </div>
          {photoViewer.photos.length > 1 && (
            <>
              <ViewerButton
                icon="left"
                label="上一张照片"
                className="photo-nav prev"
                disabled={busy}
                onClick={event => {
                  event.stopPropagation();
                  switchPhoto(-1);
                }}
              />
              <ViewerButton
                icon="right"
                label="下一张照片"
                className="photo-nav next"
                disabled={busy}
                onClick={event => {
                  event.stopPropagation();
                  switchPhoto(1);
                }}
              />
            </>
          )}
          <div className="photo-bottom-bar" onClick={event => event.stopPropagation()}>
            <span className="photo-counter" aria-live="polite">
              {photoViewer.index + 1} / {photoViewer.photos.length}
            </span>
            {getPhotoNote(currentPhoto) && (
              <div className="photo-note-bar">{getPhotoNote(currentPhoto)}</div>
            )}
            {error && <p role="alert">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
