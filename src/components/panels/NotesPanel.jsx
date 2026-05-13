import React from 'react';
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
  if (!notesPanel) return null;

  const marker = markers.find(m => m.id === notesPanel.markerId);
  if (!marker) return null;

  return (
    <div className="notes-panel-overlay" onClick={onClose}>
      <div className="notes-panel" onClick={e => e.stopPropagation()}>
        <div className="notes-panel-header">
          <h3>📝 照片备注</h3>
          <div className="header-actions">
            {!editing ? (
              <button className="edit-btn" onClick={onEdit}>✏️ 编辑</button>
            ) : (
              <>
                <button className="cancel-btn" onClick={onCancel}>取消</button>
                <button className="save-btn" onClick={() => onSave(editingNotes)}>💾 保存</button>
              </>
            )}
            <button className="panel-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="notes-list">
          {(marker.photos || []).map((photo, index) => (
            <div key={index} className="note-item">
              <LazyPhoto photo={photo} className="note-thumb" alt={`照片${index + 1}`} />
              <div className="note-content">
                <div className="note-label">照片 {index + 1}</div>
                {editing ? (
                  <textarea
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
  );
}
