import { useEffect, useState, useRef } from 'react';
import api from '../../api/index.js';
import LazyPhoto from '../photos/LazyPhoto.jsx';
import MapIcon from '../map/MapIcon.jsx';

export default function MarkerPhotos({
  marker,
  allMarkers,
  batchMode,
  selectedPhotos = [],
  onPhotoSelect,
  onSetCover,
  onDeletePhoto,
  onAddPhoto,
}) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    const cached = allMarkers?.find(item => item.id === marker.id)?.photos || marker.photos;
    const load = cached?.length ? Promise.resolve(cached) : api.photos.getByMarkerId(marker.id);
    setLoading(true);
    load
      .then(result => {
        if (active) setPhotos([...result].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999)));
      })
      .catch(() => {
        if (active) setError('照片加载失败，请收起后重新展开。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [marker.id, marker.photos, allMarkers]);
  const perform = async action => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
      setMenu(null);
    } catch {
      setError('操作失败，请重试。');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="photo-grid-expanded-inline" aria-busy={loading || busy}>
      {loading && <p role="status">正在加载照片…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading &&
        photos.map((photo, index) => {
          const selected = selectedPhotos.some(
            item => item.markerId === marker.id && item.photoId === photo.id
          );
          return (
            <div
              key={photo.id}
              className={`photo-item-expanded ${batchMode && selected ? 'selected' : ''}`}
            >
              <button
                type="button"
                className="photo-item-inner"
                disabled={busy}
                aria-label={`${batchMode ? '选择' : '照片操作'} ${index + 1}`}
                aria-pressed={batchMode ? selected : undefined}
                aria-expanded={batchMode ? undefined : menu === photo.id}
                onClick={() =>
                  batchMode
                    ? onPhotoSelect(marker.id, photo.id, index)
                    : setMenu(value => (value === photo.id ? null : photo.id))
                }
              >
                <LazyPhoto
                  photo={photo}
                  className="photo-thumb-expanded"
                  alt={`照片 ${index + 1}`}
                />
                {batchMode && selected && (
                  <span className="photo-check-expanded">
                    <MapIcon name="check" />
                  </span>
                )}
                {index === 0 && !batchMode && <span className="photo-cover-badge">封面</span>}
              </button>
              {!batchMode && menu === photo.id && (
                <div className="photo-item-menu">
                  {index !== 0 && (
                    <button
                      type="button"
                      disabled={busy || !onSetCover}
                      onClick={() => perform(() => onSetCover(marker.id, photo))}
                    >
                      <MapIcon name="star" />
                      设为封面
                    </button>
                  )}
                  <button
                    type="button"
                    className="danger"
                    disabled={busy || !onDeletePhoto}
                    onClick={() => perform(() => onDeletePhoto(marker.id, photo.id, index))}
                  >
                    <MapIcon name="trash" />
                    删除
                  </button>
                </div>
              )}
            </div>
          );
        })}
      {!batchMode && (
        <button
          type="button"
          className="photo-item-expanded photo-item-add"
          aria-label="添加照片"
          title="添加照片"
          disabled={busy || !onAddPhoto}
          onClick={() => perform(() => onAddPhoto(marker.id))}
        >
          <MapIcon name="plus" />
        </button>
      )}
    </div>
  );
}
