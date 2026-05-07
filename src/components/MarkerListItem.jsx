import { useState, memo } from 'react';
import LazyPhoto from './LazyPhoto.jsx';
import { getMatchRanges } from '../utils/searchUtils.js';

// 搜索高亮：将匹配文本用 <mark> 包裹，支持拼音和容错匹配
function highlightText(text, query) {
  if (!query || text == null) return text;
  text = String(text);

  // 1. 直接字符匹配（处理所有出现位置）
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  if (regex.test(text)) {
    regex.lastIndex = 0;
    return text.split(regex).map((part, i) =>
      i % 2 === 1 ? <mark key={i}>{part}</mark> : part
    );
  }

  // 2. 拼音/容错匹配（用 getMatchRanges 定位字符范围）
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

  // 检查第一张照片是否被选中
  const firstPhoto = marker.firstPhoto || marker.photos?.[0];
  const isFirstPhotoSelected = firstPhoto && selectedPhotos.some(
    p => p.markerId === marker.id && p.photoId === firstPhoto.id
  );

  // 批量模式下点击标记项，选择/取消选择第一张照片
  const handleMarkerClick = () => {
    if (batchMode && firstPhoto) {
      onPhotoSelect(marker.id, firstPhoto.id, 0);
    } else {
      onClick();
    }
  };

  const photoCount = marker.photoCount ?? marker.photos?.length ?? 0;
  const hasMultiplePhotos = photoCount > 1;

  // 从 allMarkers 中找到完整数据（如果有的话）
  const fullMarker = allMarkers?.find(m => m.id === marker.id);
  const displayPhotos = fullMarker?.photos || marker.photos || [];

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
            {marker.note && <span className="marker-note-preview"> · {marker.note}</span>}
            {(hasMultiplePhotos || photoCount > 0) && (
              <button
                className="expand-btn"
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
        <div className="photo-grid-expanded">
          {displayPhotos.map((photo, photoIndex) => {
            const notes = displayPhotos.filter(p => p && p.note).map(p => p.note);
            const displayNote = notes[0];
            const more = notes.length - 1;

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

export default MarkerListItem;
