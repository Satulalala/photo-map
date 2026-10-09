import MapIcon from './map/MapIcon.jsx';

export default function Toast({ toast }) {
  if (!toast) return null;
  const iconName = toast.type === 'success' ? 'check' : toast.type === 'error' ? 'close' : 'info';
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`feedback-toast ${toast.type}`}
    >
      <span className="toast-icon">
        <MapIcon name={iconName} />
      </span>
      {toast.message}
    </div>
  );
}
