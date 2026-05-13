import { useState, memo, useCallback } from 'react';
import LazyPhoto from './LazyPhoto.jsx';
import { getMatchRanges } from '../utils/searchUtils.js';

// 搜索高亮
function highlightText(text, query) {
  if (!query || text == null) return text;
  text = String(text);

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  if (regex.test(text)) {
    regex.lastIndex = 0;
    return text.split(regex).map((part, i) =>
      i % 2 === 1 ? <mark key={i}>{part}</mark> : part
    );
  }

  const ranges = getMatchRanges(query, text);
  if (ranges.length === 0) return text;

  const result = [];
  let lastEnd = 0;
  for (const [start, end] of ranges) {
    if (start > lastEnd) result.push(text.slice(lastEnd, start));
    result.push(<mark key={result.length}>{text.slice(start, end)}</mark>);
    lastEnd = end;
  }
  if (lastEnd < text.length) result.push(text.slice(lastEnd));
  return result;
}

export { highlightText };

const MarkerListItem = memo(function MarkerListItem({ marker, onClick, batchMode, selectedPhotos, onPhotoSelect, allMarkers, onDeletePhoto, onSetCover, onAddPhoto, highlight, focused, dataIndex }) {
  const [expanded, setExpanded] = useState(false);
  const [photoMenu, setPhotoMenu] = useState(null);
  const [loadedPhotos, setLoadedPhotos] = useState(null);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const firstPhoto = marker.firstPhoto || marker.photos?.[0];
  const isFirstPhotoSelected = firstPhoto && selectedPhotos.some(
    p => p.markerId === marker.id && p.photoId === firstPhoto.id
  );

  const handleMarkerClick = () => {
    if (batchMode && firstPhoto) {
      onPhotoSelect(marker.id, firstPhoto.id, 0);
    } else {
      onClick();
    }
  };

  const photoCount = marker.photoCount ?? marker.photos?.length ?? 0;
  const hasMultiplePhotos = photoCount > 0;

  // 展开时加载照片
  const handleToggleExpand = useCallback(async e => {
    e.stopPropagation();
    if (expanded) {
      setExpanded(false);
      return;
    }
    // 优先用已加载的
    if (loadedPhotos) {
      setExpanded(true);
      return;
    }
    setLoadingPhotos(true);
    try {
      let photos = marker.photos;
      if (!photos || photos.length === 0) {
        const apiModule = await import('../api/index.js');
        const api = apiModule.default;
        photos = await api.photos.getByMarkerId(marker.id);
        const sorted = [...photos].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
        setLoadedPhotos(sorted);
      } else {
        setLoadedPhotos(photos);
      }
      setExpanded(true);
    } catch {
      // 加载失败仍尝试展开
      setLoadedPhotos([]);
      setExpanded(true);
    } finally {
      setLoadingPhotos(false);
    }
  }, [expanded, loadedPhotos, marker.id, marker.photos]);

  // 照片级别的备注 — 取第一张照片的备注作为标记卡片的备注预览
  const displayPhotos = loadedPhotos || marker.photos || [];
  const firstNote = displayPhotos.find(p => p && p.note)?.note || marker.firstPhoto?.note || '';

  return (
    <div className="marker-list-item-wrapper">
      <div
        className={`marker-list-item ${batchMode && isFirstPhotoSelected ? 'selected' : ''} ${focused ? 'focused' : ''}`}
        onClick={handleMarkerClick}
        data-index={dataIndex}
      >
        {firstPhoto ? (
          <div className="marker-thumb-wrapper">
            <LazyPhoto photo={firstPhoto} className="marker-thumb" />
            {batchMode && isFirstPhotoSelected && (
              <div className="marker-check">✓</div>
            )}
          </div>
        ) : (
          <div className="marker-thumb-placeholder">📍</div>
        )}
        <div className="marker-info">
          <div className="marker-name">
            {highlight ? highlightText(marker.name || `${marker.lat.toFixed(3)}°, ${marker.lng.toFixed(3)}°`, highlight) : (marker.name || `${marker.lat.toFixed(3)}°, ${marker.lng.toFixed(3)}°`)}
          </div>
          <div className="marker-meta">
            📷 {photoCount}
            {firstNote && <span className="marker-note-preview"> · {firstNote}</span>}
            {hasMultiplePhotos && (
              <button
                className="expand-btn"
                onClick={handleToggleExpand}
                title={expanded ? '收起' : '展开'}
              >
                {loadingPhotos ? '⋯' : (expanded ? '▲' : '▼')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 展开显示所有照片 */}
      {expanded && loadedPhotos && (
        <div className="photo-grid-expanded">
          {loadedPhotos.map((photo, photoIndex) => {
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
                  onClick={e => {
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
                {photo.note && !batchMode && (
                  <div className="photo-note-label">{photo.note}</div>
                )}
                {isMenuOpen && !batchMode && (
                  <div className="photo-item-menu" onClick={e => e.stopPropagation()}>
                    {!isCover && (
                      <button onClick={() => { onSetCover && onSetCover(marker.id, photo); setPhotoMenu(null); }}>
                        ⭐ 设为封面
                      </button>
                    )}
                    <button onClick={() => { onClick(); setPhotoMenu(null); }}>
                      👁️ 查看
                    </button>
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
              onClick={e => { e.stopPropagation(); onAddPhoto && onAddPhoto(marker.id); }}
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

export default MarkerListItem;
