import { useEffect, useState } from 'react';
import { usePanelAction } from '../../hooks/usePanelAction.js';
import MapIcon from '../map/MapIcon.jsx';
import { useDialogFocus } from '../../hooks/useDialogFocus.js';
import { usePresenceTransition } from '../../hooks/usePresenceTransition.js';
import LazyPhoto from '../photos/LazyPhoto.jsx';

export default function NotesPanel({
  notesPanel,
  markers,
  editing,
  editingNotes,
  getPhotoNote,
  onClose,
  onEdit,
  onSave,
  onCancel,
}) {
  const { busy, error, run, canClose } = usePanelAction();
  const [zoomState, setZoomState] = useState(null);
  const close = () => {
    if (canClose()) void run(onClose);
  };
  const closeZoom = () => setZoomState(null);
  const presence = usePresenceTransition(notesPanel, 180);
  const zoomPresence = usePresenceTransition(zoomState, 180);
  useDialogFocus(Boolean(notesPanel), '.notes-panel', close);
  useDialogFocus(Boolean(zoomState), '.note-zoom-dialog', closeZoom);

  useEffect(() => {
    if (!notesPanel) setZoomState(null);
  }, [notesPanel]);

  if (!presence.mounted) return null;

  const activePanel = presence.snapshot;
  const marker = activePanel?.marker || markers.find(m => m.id === activePanel?.markerId);
  if (!marker) return null;
  const activeZoom = zoomPresence.snapshot;
  const zoomCaption = activeZoom
    ? editing
      ? editingNotes[activeZoom.index]
      : getPhotoNote(activeZoom.photo)
    : '';

  return (
    <>
      <div className={`notes-panel-overlay ${presence.exiting ? 'closing' : ''}`} onClick={close}>
        <div
          role="dialog"
          aria-modal="true"
          aria-busy={busy}
          aria-label="照片备注"
          tabIndex={-1}
          className={`notes-panel ${presence.exiting ? 'closing' : ''}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="notes-panel-header">
            {error && <p role="alert">{error}</p>}
            <h3>
              <MapIcon name="edit" />
              照片备注
            </h3>
            <div className="header-actions">
              {!editing ? (
                <button className="edit-btn" disabled={busy} onClick={onEdit}>
                  <MapIcon name="edit" />
                  编辑
                </button>
              ) : (
                <>
                  <button className="cancel-btn" disabled={busy} onClick={onCancel}>
                    取消
                  </button>
                  <button
                    className="save-btn"
                    disabled={busy}
                    onClick={() => run(() => onSave(editingNotes))}
                  >
                    保存
                  </button>
                </>
              )}
              <button type="button" aria-label="关闭窗口" className="panel-close" onClick={close}>
                <MapIcon name="close" />
              </button>
            </div>
          </div>
          <div className="notes-list">
            {(marker.photos || []).map((photo, index) => (
              <div key={index} className="note-item">
                <button
                  type="button"
                  className="note-thumb-btn"
                  aria-label={`放大查看照片 ${index + 1}`}
                  onClick={() => setZoomState({ photo, index })}
                >
                  <LazyPhoto photo={photo} className="note-thumb" alt={`照片${index + 1}`} />
                </button>
                <div className="note-content">
                  <div className="note-label">照片 {index + 1}</div>
                  {editing ? (
                    <textarea
                      disabled={busy}
                      aria-label={`照片 ${index + 1} 的备注`}
                      value={editingNotes[index] || ''}
                      onChange={e => {
                        const newNotes = [...editingNotes];
                        newNotes[index] = e.target.value;
                        onSave(newNotes, true); // true 表示仅更新状态，不保存到数据库
                      }}
                      placeholder="输入备注..."
                    />
                  ) : (
                    <div className="note-text">{getPhotoNote(photo) || '暂无备注'}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {zoomPresence.mounted && activeZoom && (
        <div
          className={`note-zoom-overlay ${zoomPresence.exiting ? 'closing' : ''}`}
          onClick={closeZoom}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`照片 ${activeZoom.index + 1} 大图预览`}
            tabIndex={-1}
            className={`note-zoom-dialog ${zoomPresence.exiting ? 'closing' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <LazyPhoto
              photo={activeZoom.photo}
              useThumbnail={false}
              className="note-zoom-photo"
              alt={`照片${activeZoom.index + 1}大图`}
            />
            <div className="note-zoom-footer">
              <span className="note-zoom-caption">{zoomCaption || '暂无备注'}</span>
              <button type="button" className="note-zoom-close" onClick={closeZoom}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
