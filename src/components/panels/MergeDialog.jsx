import { usePanelAction } from '../../hooks/usePanelAction.js';
import MapIcon from '../map/MapIcon.jsx';
import { useDialogFocus } from '../../hooks/useDialogFocus.js';
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
  const { busy, error, run, canClose } = usePanelAction();
  const close = () => {
    if (canClose()) void run(onClose);
  };
  useDialogFocus(show, '.merge-dialog', close);
  if (!show) return null;

  return (
    <div className="merge-dialog-overlay" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-busy={busy}
        aria-label="整合照片"
        tabIndex={-1}
        className={`merge-dialog themed-floating-panel theme-${uiThemeStyle}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="merge-dialog-header">
          {error && <p role="alert">{error}</p>}
          <h3>
            <MapIcon name="layers" />
            整合照片
          </h3>
          <button type="button" aria-label="关闭窗口" className="panel-close" onClick={close}>
            <MapIcon name="close" />
          </button>
        </div>
        <div className="merge-dialog-content">
          <p className="merge-hint">
            已选择 {selectedPhotos.length} 张照片，请选择一张照片作为整合后的位置：
          </p>
          <div className="merge-photo-grid">
            {selectedPhotos.map((selected, idx) => {
              const marker = markers.find(m => m.id === selected.markerId);
              const photo = marker?.photos?.[selected.photoIndex] ||
                marker?.firstPhoto || { id: selected.photoId };
              if (!photo || !marker) return null;

              const isTarget =
                mergeTargetPhoto?.markerId === selected.markerId &&
                mergeTargetPhoto?.photoId === selected.photoId;

              return (
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={isTarget}
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
                  {isTarget && (
                    <div className="merge-target-badge">
                      <MapIcon name="pin" />
                      目标位置
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="merge-dialog-footer">
          <button className="merge-cancel-btn" disabled={busy} onClick={onCancel}>
            取消
          </button>
          <button
            className="merge-confirm-btn"
            onClick={() => run(onMerge)}
            disabled={busy || !mergeTargetPhoto}
          >
            确认整合
          </button>
        </div>
      </div>
    </div>
  );
}
