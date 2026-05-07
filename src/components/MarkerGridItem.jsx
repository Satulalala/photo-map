import { useState, memo } from 'react';
import LazyPhoto from './LazyPhoto.jsx';

const MarkerGridItem = memo(function MarkerGridItem({ marker, onClick, batchMode, selectedPhotos, onPhotoSelect, allMarkers, onDeletePhoto, onSetCover, onAddPhoto }) {
  const [expanded, setExpanded] = useState(false);
  const [photoMenu, setPhotoMenu] = useState(null);

  const firstPhoto = marker.firstPhoto || marker.photos?.[0];
  const isFirstPhotoSelected = firstPhoto && selectedPhotos.some(
    p => p.markerId === marker.id && p.photoId === firstPhoto.id
  );

  const photoCount = marker.photoCount ?? marker.photos?.length ?? 0;
  const hasMultiplePhotos = photoCount > 1;

  const fullMarker = allMarkers?.find(m => m.id === marker.id);
  const displayPhotos = fullMarker?.photos || marker.photos || [];

  const handleGridItemClick = () => {
    if (batchMode && firstPhoto) {
      onPhotoSelect(marker.id, firstPhoto.id, 0);
    } else {
      onClick();
    }
  };

  return (
    <div className="marker-grid-item-wrapper">
      <div
        className={`marker-grid-item ${batchMode && isFirstPhotoSelected ? 'selected' : ''}`}
        onClick={handleGridItemClick}
      >
        {firstPhoto && (
          <div className="marker-grid-thumb-wrapper">
            <LazyPhoto photo={firstPhoto} className="marker-grid-thumb" />
            {batchMode && isFirstPhotoSelected && (
              <div className="marker-grid-check">✓</div>
            )}
          </div>
        )}
        <div className="marker-grid-info">
          <div className="marker-grid-name">
            {marker.name || `${marker.lat.toFixed(3)}°, ${marker.lng.toFixed(3)}°`}
          </div>
          <div className="marker-grid-meta">
            📷 {photoCount}
            {(hasMultiplePhotos || photoCount > 0) && (
              <button
                className="grid-expand-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                title={expanded ? '收起' : '展开'}
              >
                {expanded ? '▲' : '▼'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 展开显示所有照片 */}
      {expanded && (
        <div className="photo-grid-expanded-inline">
          {displayPhotos.map((photo, photoIndex) => {
            const isSelected = batchMode && selectedPhotos.some(
              p => p.markerId === marker.id && p.photoId === photo.id
            );
            const isCover = photoIndex === 0;
            const isMenuOpen = photoMenu?.photoId === photo.id;
            return (
              <div
                key={photo.id}
                className={`photo-item-expanded ${isSelected ? 'selected' : ''}`}
                style={{ position: 'relative' }}
              >
                <div
                  className="photo-item-inner"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (batchMode) {
                      onPhotoSelect(marker.id, photo.id, photoIndex);
                    } else {
                      setPhotoMenu(isMenuOpen ? null : { photoId: photo.id, photoIndex });
                    }
                  }}
                >
                  <LazyPhoto photo={photo} className="photo-thumb-expanded" />
                  {batchMode && isSelected && <div className="photo-check-expanded">✓</div>}
                  {isCover && !batchMode && <div className="photo-cover-badge">封面</div>}
                </div>
                {isMenuOpen && !batchMode && (
                  <div className="photo-item-menu" onClick={e => e.stopPropagation()}>
                    {!isCover && (
                      <button onClick={() => { onSetCover && onSetCover(marker.id, photo); setPhotoMenu(null); }}>
                        ⭐ 设为封面
                      </button>
                    )}
                    <button className="danger" onClick={() => { onDeletePhoto && onDeletePhoto(marker.id, photo.id, photoIndex); setPhotoMenu(null); }}>
                      🗑️ 删除
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {/* 虚线添加照片框 */}
          {!batchMode && (
            <div
              className="photo-item-expanded photo-item-add"
              onClick={(e) => { e.stopPropagation(); onAddPhoto && onAddPhoto(marker.id); }}
              title="添加照片"
            >
              <span>＋</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default MarkerGridItem;
