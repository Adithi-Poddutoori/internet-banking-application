import { useEffect } from 'react';

export default function Toast({ message, type, onClose }) {
  useEffect(() => {
    if (!message || type === 'error') return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [message, type, onClose]);

  if (!message) return null;

  // Show errors as centered popup modal
  if (type === 'error') {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="error-modal-icon">⚠️</div>
          <h3>Something went wrong</h3>
          <p className="error-modal-msg">{message}</p>
          <div className="modal-actions">
            <button className="button button--primary" onClick={onClose}>OK</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`toast toast--${type || 'info'}`} onClick={onClose}>
      <span className="toast__icon">✓</span>
      <span className="toast__text">{message}</span>
    </div>
  );
}
