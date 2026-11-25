import { useState, memo } from 'react';
import LazyPhoto from '../photos/LazyPhoto.jsx';
import MapIcon from '../map/MapIcon.jsx';
import MarkerPhotos from './MarkerPhotos.jsx';
import { usePresenceTransition } from '../../hooks/usePresenceTransition.js';

const MarkerGridItem = memo(function MarkerGridItem(props) {
  const { marker, onClick, batchMode, selectedPhotos = [], onPhotoSelect } = props;
  const [expanded, setExpanded] = useState(false);
  const photosPresence = usePresenceTransition(expanded, 220);
  const firstPhoto = marker.firstPhoto || marker.photos?.[0];
  const count = marker.photoCount ?? marker.photos?.length ?? 0;
  const selected =
    firstPhoto &&
    selectedPhotos.some(item => item.markerId === marker.id && item.photoId === firstPhoto.id);
  const name = marker.name || `${marker.lat.toFixed(3)}°, ${marker.lng.toFixed(3)}°`;
  const note = marker.photos?.find(photo => typeof photo === 'object' && photo?.note?.trim())?.note?.trim()
    || firstPhoto?.note?.trim()
    || marker.note?.trim()
    || '';
  const openAction = () =>
    batchMode && firstPhoto ? onPhotoSelect(marker.id, firstPhoto.id, 0) : onClick();

  return (
    <div className="marker-grid-item-wrapper">
      <div className={`marker-grid-item ${batchMode && selected ? 'selected' : ''}`}>
        <button
          type="button"
          className="marker-open grid-open"
          aria-label={`${batchMode ? '选择' : '打开'} ${name}`}
          aria-pressed={batchMode ? Boolean(selected) : undefined}
          onClick={openAction}
        >
          <span className="marker-grid-thumb-box">
            {firstPhoto ? (
              <LazyPhoto photo={firstPhoto} className="marker-grid-thumb" alt={name} />
            ) : (
              <span className="marker-thumb-placeholder">
                <MapIcon name="pin" />
              </span>
            )}
            {count > 0 && <span className="gallery-count-tag">{count} 张</span>}
          </span>
          <span className="marker-grid-info">
            <span className="marker-grid-name">{name}</span>
            <span className="marker-grid-meta">{note || `${count} 张照片`}</span>
          </span>
          {batchMode && selected && <MapIcon name="check" />}
        </button>
        <div className="marker-grid-foot">
          <button
            type="button"
            className="gallery-foot-btn"
            aria-label={`${batchMode ? (selected ? '取消选择' : '选择') : '定位地图'} ${name}`}
            onClick={openAction}
          >
            {batchMode ? (selected ? '已选' : '选择') : '定位地图'}
          </button>
          {count > 0 ? (
            <button
              type="button"
              className="grid-expand-btn"
              aria-expanded={expanded}
              aria-label={`${expanded ? '收起' : '展开'} ${name} 的照片`}
              onClick={() => setExpanded(value => !value)}
            >
              <span>{expanded ? '收起' : `查看 ${count} 张`}</span>
              <MapIcon name="chevron" />
            </button>
          ) : (
            <span className="gallery-foot-empty">0 张</span>
          )}
        </div>
      </div>
      {photosPresence.mounted && (
        <div
          className={`marker-photos-accordion ${photosPresence.exiting ? 'closing' : photosPresence.entered ? 'open' : ''}`}
        >
          <div className="marker-photos-accordion-inner">
            <MarkerPhotos {...props} />
          </div>
        </div>
      )}
    </div>
  );
});
export default MarkerGridItem;
