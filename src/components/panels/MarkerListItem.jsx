import { useState, memo } from 'react';
import LazyPhoto from '../photos/LazyPhoto.jsx';
import MarkerPhotos from './MarkerPhotos.jsx';
import MapIcon from '../map/MapIcon.jsx';
import { getMatchRanges } from '../../utils/searchUtils.js';

// 搜索高亮
function highlightText(text, query) {
  if (!query || text == null) return text;
  text = String(text);

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  if (regex.test(text)) {
    regex.lastIndex = 0;
    return text.split(regex).map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part));
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

const MarkerListItem = memo(function MarkerListItem(props) {
  const {
    marker,
    onClick,
    batchMode,
    selectedPhotos = [],
    onPhotoSelect,
    highlight,
    focused,
    dataIndex,
  } = props;
  const [expanded, setExpanded] = useState(false);
  const firstPhoto = marker.firstPhoto || marker.photos?.[0];
  const count = marker.photoCount ?? marker.photos?.length ?? 0;
  const selected =
    firstPhoto &&
    selectedPhotos.some(item => item.markerId === marker.id && item.photoId === firstPhoto.id);
  const name = marker.name || `${marker.lat.toFixed(3)}°, ${marker.lng.toFixed(3)}°`;
  const note = marker.photos?.find(photo => photo.note)?.note || firstPhoto?.note;
  return (
    <div className="marker-list-item-wrapper">
      <div
        className={`marker-list-item ${batchMode && selected ? 'selected' : ''} ${focused ? 'focused' : ''}`}
      >
        <button
          type="button"
          className="marker-open"
          data-index={dataIndex}
          aria-label={`${batchMode ? '选择' : '打开'} ${name}`}
          aria-pressed={batchMode ? Boolean(selected) : undefined}
          onClick={() =>
            batchMode && firstPhoto ? onPhotoSelect(marker.id, firstPhoto.id, 0) : onClick()
          }
        >
          {firstPhoto ? (
            <LazyPhoto photo={firstPhoto} className="marker-thumb" alt={name} />
          ) : (
            <span className="marker-thumb-placeholder">
              <MapIcon name="pin" />
            </span>
          )}
          <span className="marker-info">
            <span className="marker-name">{highlight ? highlightText(name, highlight) : name}</span>
            <span className="marker-meta">
              <MapIcon name="photo" />
              {count} 张{note && <span className="marker-note-preview"> · {note}</span>}
            </span>
          </span>
          {batchMode && selected && <MapIcon name="check" />}
        </button>
        {count > 0 && (
          <button
            type="button"
            className="expand-btn"
            aria-expanded={expanded}
            aria-label={`${expanded ? '收起' : '展开'} ${name} 的照片`}
            title={expanded ? '收起照片' : '展开照片'}
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
export default MarkerListItem;
