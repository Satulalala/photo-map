export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`feedback-toast ${toast.type}`}>
      <span className="toast-icon">
        {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
      </span>
      {toast.message}
    </div>
  );
}
