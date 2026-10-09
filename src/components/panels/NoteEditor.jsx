import { usePanelAction } from '../../hooks/usePanelAction.js';
import MapIcon from '../map/MapIcon.jsx';
import { useDialogFocus } from '../../hooks/useDialogFocus.js';
import { useEffect, useRef } from 'react';

export default function NoteEditor({ noteEditor, onClose, onSave, onNoteChange }) {
  const inputRef = useRef(null);
  const isOpen = Boolean(noteEditor);
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);
  const { busy, error, run, canClose } = usePanelAction();
  const close = () => {
    if (canClose()) void run(onClose);
  };
  useDialogFocus(isOpen, '.note-editor', close);
  if (!noteEditor) return null;

  return (
    <div className="note-editor-overlay" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-busy={busy}
        aria-label="编辑备注"
        tabIndex={-1}
        className="note-editor"
        onClick={e => e.stopPropagation()}
      >
        {error && <p role="alert">{error}</p>}
        <h3>
          <MapIcon name="edit" />
          编辑备注
        </h3>
        <textarea
          disabled={busy}
          value={noteEditor.note}
          onChange={e => onNoteChange(e.target.value)}
          placeholder="输入照片备注..."
          ref={inputRef}
          aria-label="照片备注"
        />
        <div className="note-editor-btns">
          <button onClick={close}>取消</button>
          <button className="save" disabled={busy} onClick={() => run(onSave)}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
