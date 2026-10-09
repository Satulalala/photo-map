import { useState, memo } from 'react';
import LazyPhoto from '../photos/LazyPhoto.jsx';
import MapIcon from '../map/MapIcon.jsx';
import MarkerPhotos from './MarkerPhotos.jsx';

const MarkerGridItem = memo(function MarkerGridItem(props) {
  const { marker, onClick, batchMode, selectedPhotos = [], onPhotoSelect } = props;
  const [expanded, setExpanded] = useState(false);
  const firstPhoto = marker.firstPhoto || marker.photos?.[0];
  const count = marker.photoCount ?? marker.photos?.length ?? 0;
  const selected =
    firstPhoto &&
    selectedPhotos.some(item => item.markerId === marker.id && item.photoId === firstPhoto.id);
  const name = marker.name || `${marker.lat.toFixed(3)}°, ${marker.lng.toFixed(3)}°`;
  return (
    <div className="marker-grid-item-wrapper">
      <div className={`marker-grid-item ${batchMode && selected ? 'selected' : ''}`}>
        <button
          type="button"
          className="marker-open grid-open"
          aria-label={`${batchMode ? '选择' : '打开'} ${name}`}
          aria-pressed={batchMode ? Boolean(selected) : undefined}
          onClick={() =>
            batchMode && firstPhoto ? onPhotoSelect(marker.id, firstPhoto.id, 0) : onClick()
          }
        >
          {firstPhoto ? (
            <LazyPhoto photo={firstPhoto} className="marker-grid-thumb" alt={name} />
          ) : (
            <span className="marker-thumb-placeholder">
              <MapIcon name="pin" />
            </span>
          )}
          <span className="marker-grid-info">
            <span className="marker-grid-name">{name}</span>
            <span className="marker-grid-meta">
              <MapIcon name="photo" />
              {count} 张
            </span>
          </span>
          {batchMode && selected && <MapIcon name="check" />}
        </button>
        {count > 0 && (
          <button
            type="button"
            className="grid-expand-btn"
            aria-expanded={expanded}
            aria-label={`${expanded ? '收起' : '展开'} ${name} 的照片`}
            onClick={() => setExpanded(value => !value)}
          >
            <MapIcon name="chevron" />
          </button>
        )}
      </div>
      {expanded && <MarkerPhotos {...props} />}
    </div>
  );
});
export default MarkerGridItem;
