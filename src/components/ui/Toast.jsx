import { memo } from 'react';

/**
 * Toast 提示组件
 * @module components/ui/Toast
 */
const Toast = memo(function Toast({ toast }) {
  if (!toast) return null;
  
  return (
    <div className={`feedback-toast ${toast.type}`}>
      <span className="toast-icon">
        {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
      </span>
      {toast.message}
    </div>
  );
});

export default Toast;
