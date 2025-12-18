import { memo } from 'react';
import LazyPhoto from './LazyPhoto';

/**
 * 标记列表项组件
 */
const MarkerListItem = memo(function MarkerListItem({ marker, onClick }) {
  const photo = marker.firstPhoto || marker.photos?.[0];
  const note = photo?.note || '';
  
  return (
    <div className="marker-list-item" onClick={onClick}>
      {photo && (
        <LazyPhoto photo={photo} className="marker-list-thumb" />
      )}
      <div className="marker-list-info">
        <div className="marker-list-name">
          {marker.name || `${marker.lat.toFixed(3)}°, ${marker.lng.toFixed(3)}°`}
        </div>
        {note && (
          <div className="marker-list-note">📝 {note}</div>
        )}
        <div className="marker-list-meta">
          📷 {marker.photoCount ?? marker.photos?.length ?? 0} 张 · {marker.createdAt ? new Date(marker.createdAt).toLocaleDateString('zh-CN') : '未知时间'}
        </div>
      </div>
    </div>
  );
});

export default MarkerListItem;
