import MapIcon from './map/MapIcon.jsx';
import { usePresenceTransition } from '../hooks/usePresenceTransition.js';

export default function Toast({ toast }) {
  const presence = usePresenceTransition(toast, 180);
  const activeToast = presence.snapshot;
  if (!presence.mounted || !activeToast) return null;
  const iconName =
    activeToast.type === 'success' ? 'check' : activeToast.type === 'error' ? 'close' : 'info';
  return (
    <div
      role={activeToast.type === 'error' ? 'alert' : 'status'}
      className={`feedback-toast ${activeToast.type} ${presence.exiting ? 'closing' : ''}`}
    >
      <span className="toast-icon" aria-hidden="true">
        <MapIcon name={iconName} />
      </span>
      <span className="toast-message">{activeToast.message}</span>
    </div>
  );
}
