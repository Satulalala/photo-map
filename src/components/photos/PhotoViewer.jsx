import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../../api/index.js';
import { getPhotoDisplayUrl } from '../../api/photoFileAccess.js';
import MapIcon from '../map/MapIcon.jsx';
import { useDialogFocus } from '../../hooks/useDialogFocus.js';
import { usePresenceTransition } from '../../hooks/usePresenceTransition.js';

function ViewerButton({ icon, label, ...props }) {
  return (
    <button type="button" className="pv-btn" title={label} aria-label={label} {...props}>
      <MapIcon name={icon} />
    </button>
  );
}

function getDirectThumbUrl(photo) {
  if (!photo) return '';
  if (typeof photo === 'string') return photo;
  return photo.thumbnailUrl || photo.url || (photo.data?.startsWith('data:') ? photo.data : '');
}

function FilmstripThumb({ photo, index, active, activeUrl, onSelect }) {
  const directUrl = getDirectThumbUrl(photo);
  const [resolvedUrl, setResolvedUrl] = useState(directUrl);

  useEffect(() => {
    setResolvedUrl(directUrl);
    if (directUrl || !photo?.id) return;
    let activeFlag = true;
    Promise.resolve(getPhotoDisplayUrl(photo.id, true))
      .then(url => {
        if (activeFlag && url) setResolvedUrl(url);
      })
      .catch(() => {});
    return () => {
      activeFlag = false;
    };
  }, [directUrl, photo]);

  const src = resolvedUrl || (active ? activeUrl : '');

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={`查看第 ${index + 1} 张照片`}
      className={`pv-film-thumb ${active ? 'active' : ''}`}
      onClick={onSelect}
    >
      {src ? (
        <img src={src} alt={`缩略图 ${index + 1}`} draggable={false} />
      ) : (
        <span className="pv-film-placeholder" aria-hidden="true">
          <MapIcon name="photo" />
        </span>
      )}
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
  const [slideDirection, setSlideDirection] = useState('fade');
  const [idle, setIdle] = useState(false);
  const pending = useRef(false);
  const idleTimerRef = useRef(null);
  const presence = usePresenceTransition(photoViewer, 180);
  const activeViewer = presence.snapshot;
  const currentPhoto = activeViewer?.photos?.[activeViewer.index];

  const resetIdleTimer = useCallback(() => {
    setIdle(false);
    clearTimeout(idleTimerRef.current);
    if (!photoViewer || batchMode) return;
    idleTimerRef.current = setTimeout(() => setIdle(true), 2200);
  }, [photoViewer, batchMode]);

  useEffect(() => {
    setSlideDirection('fade');
  }, [photoViewer?.markerId]);

  useEffect(() => {
    resetIdleTimer();
    return () => clearTimeout(idleTimerRef.current);
  }, [resetIdleTimer]);

  // The photo loader owns this URL; changing views must not revoke it.
  const handleClose = useCallback(async () => {
    if (pending.current || !activeViewer) return;
    if (activeViewer.returnToMenu) {
      try {
        const detail = window.electronAPI?.getMarkerDetail
          ? await window.electronAPI.getMarkerDetail(activeViewer.markerId)
          : markers.find(marker => marker.id === activeViewer.markerId);
        if (detail) setMarkerMenu({ ...activeViewer.returnToMenu, marker: detail });
      } catch {
        setError('无法恢复地点详情，请稍后重试。');
        return;
      }
    }
    setPhotoViewer(null);
  }, [activeViewer, markers, setMarkerMenu, setPhotoViewer]);
  useDialogFocus(Boolean(photoViewer), '.photo-viewer', handleClose);

  if (!presence.mounted || !activeViewer) return null;

  const switchPhoto = direction => {
    if (pending.current) return;
    setError('');
    setSlideDirection(direction > 0 ? 'next' : 'prev');
    resetIdleTimer();
    setPhotoViewer(value => ({
      ...value,
      index: (value.index + direction + value.photos.length) % value.photos.length,
    }));
  };

  const jumpToPhoto = nextIndex => {
    if (pending.current || nextIndex === activeViewer.index) return;
    setError('');
    setSlideDirection(nextIndex > activeViewer.index ? 'next' : 'prev');
    resetIdleTimer();
    setPhotoViewer(value => ({
      ...value,
      index: nextIndex,
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
      await api.photos.delete(activeViewer.markerId, currentPhoto.id);
      const photos = activeViewer.photos.filter((_, index) => index !== activeViewer.index);
      setPhotoViewer({
        ...activeViewer,
        photos,
        index: Math.min(activeViewer.index, photos.length - 1),
      });
      await refreshMarkers();
    });
  };

  return (
    <div
      className={`photo-viewer ${batchMode ? 'batch-select-mode' : ''} ${idle && !batchMode ? 'is-idle' : ''} ${presence.exiting ? 'closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={batchMode ? '选择照片' : '照片查看器'}
      aria-busy={busy}
      tabIndex={-1}
      onClick={handleClose}
      onMouseMove={resetIdleTimer}
      onKeyDown={event => {
        resetIdleTimer();
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
            {activeViewer.photos.map((photo, index) => {
              const selected = selectedPhotos.some(
                item => item.markerId === activeViewer.markerId && item.photoId === photo.id
              );
              return (
                <button
                  type="button"
                  key={photo.id}
                  className={`batch-select-item ${selected ? 'selected' : ''}`}
                  aria-pressed={selected}
                  aria-label={`选择照片 ${index + 1}`}
                  onClick={() => onPhotoSelect(activeViewer.markerId, photo.id, index)}
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
                  returnToViewer: activeViewer,
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
                link.download = `照片_${activeViewer.index + 1}.jpg`;
                link.href = currentPhotoUrl;
                link.click();
              }}
            />
            {activeViewer.photos.length > 1 && (
              <>
                <ViewerButton
                  icon="star"
                  label={activeViewer.index === 0 ? '当前为封面' : '设为封面'}
                  aria-pressed={activeViewer.index === 0}
                  disabled={busy || activeViewer.index === 0 || !onSetCover}
                  onClick={() => perform(() => onSetCover(activeViewer.markerId, currentPhoto))}
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
                key={currentPhoto?.id || activeViewer.index}
                className={`pv-photo-img anim-${slideDirection}`}
                src={currentPhotoUrl}
                alt={getPhotoNote(currentPhoto) || `照片 ${activeViewer.index + 1}`}
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
          {activeViewer.photos.length > 1 && (
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
            <div className="pv-meta-row">
              <span className="photo-counter" aria-live="polite">
                {activeViewer.index + 1} / {activeViewer.photos.length}
              </span>
              {getPhotoNote(currentPhoto) && (
                <div className="photo-note-bar">{getPhotoNote(currentPhoto)}</div>
              )}
            </div>
            {activeViewer.photos.length > 1 && (
              <div className="pv-filmstrip" role="tablist" aria-label="照片缩略图列表">
                {activeViewer.photos.map((photo, index) => (
                  <FilmstripThumb
                    key={photo.id || index}
                    photo={photo}
                    index={index}
                    active={index === activeViewer.index}
                    activeUrl={currentPhotoUrl}
                    onSelect={() => jumpToPhoto(index)}
                  />
                ))}
              </div>
            )}
            {error && <p role="alert">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
