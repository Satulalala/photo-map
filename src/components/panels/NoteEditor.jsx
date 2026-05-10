export default function NoteEditor({
  noteEditor,
  onClose,
  onSave,
  onNoteChange,
}) {
  if (!noteEditor) return null;

  return (
    <div className="note-editor-overlay" onClick={onClose}>
      <div className="note-editor" onClick={e => e.stopPropagation()}>
        <h3>📝 编辑备注</h3>
        <textarea
          value={noteEditor.note}
          onChange={e => onNoteChange(e.target.value)}
          placeholder="输入照片备注..."
          autoFocus
        />
        <div className="note-editor-btns">
          <button onClick={onClose}>取消</button>
          <button className="save" onClick={onSave}>保存</button>
        </div>
      </div>
    </div>
  );
}
