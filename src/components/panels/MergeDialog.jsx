import React from 'react';
import LazyPhoto from '../photos/LazyPhoto.jsx';

export default function MergeDialog({
  show,
  selectedPhotos,
  mergeTargetPhoto,
  uiThemeStyle,
  markers,
  onSelectTarget,
  onClose,
  onCancel,
  onMerge,
}) {
  if (!show) return null;

  return (
    <div className="merge-dialog-overlay" onClick={onClose}>
      <div className={`merge-dialog themed-floating-panel theme-${uiThemeStyle}`} onClick={e => e.stopPropagation()}>
        <div className="merge-dialog-header">
          <h3>🔗 整合照片</h3>
          <button className="panel-close" onClick={onClose}>✕</button>
        </div>
        <div className="merge-dialog-content">
          <p className="merge-hint">
            已选择 {selectedPhotos.length} 张照片，请选择一张照片作为整合后的位置：
          </p>
          <div className="merge-photo-grid">
            {selectedPhotos.map((selected, idx) => {
              const marker = markers.find(m => m.id === selected.markerId);
              const photo = marker?.photos?.[selected.photoIndex] || marker?.firstPhoto || { id: selected.photoId };
              if (!photo) return null;

              const isTarget = mergeTargetPhoto?.markerId === selected.markerId &&
                               mergeTargetPhoto?.photoId === selected.photoId;

              return (
                <div
                  key={`${selected.markerId}-${selected.photoId}`}
                  className={`merge-photo-item ${isTarget ? 'target' : ''}`}
                  onClick={() => onSelectTarget(selected)}
                >
                  <LazyPhoto photo={photo} className="merge-photo-thumb" />
                  <div className="merge-photo-info">
                    <div className="merge-photo-location">
                      {marker.name || `${marker.lat.toFixed(3)}°, ${marker.lng.toFixed(3)}°`}
                    </div>
                  </div>
                  {isTarget && <div className="merge-target-badge">📍 目标位置</div>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="merge-dialog-footer">
          <button
            className="merge-cancel-btn"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="merge-confirm-btn"
            onClick={onMerge}
            disabled={!mergeTargetPhoto}
          >
            确认整合
          </button>
        </div>
      </div>
    </div>
  );
}
