import { useState } from 'react';

export default function WorkflowModal({ open, onClose, onConfirm, icon, title, subtitle, details, steps, confirmLabel }) {
  const [agreed, setAgreed] = useState(false);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="workflow-modal-header">
          <span className="workflow-modal-header__icon">{icon}</span>
          <div>
            <h3 style={{ margin: 0 }}>{title}</h3>
            {subtitle && <p style={{ margin: '0.2rem 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>{subtitle}</p>}
          </div>
        </div>

        {details && details.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {details.map(([label, value], i) => (
              <div key={i} style={{ fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted)' }}>{label}: </span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        )}

        {steps && steps.length > 0 && (
          <div className="workflow-steps">
            {steps.map((step, i) => (
              <div className="workflow-step" key={i}>
                <span className="workflow-step__num">{i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', margin: '0.75rem 0' }}>
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
          I understand and wish to proceed
        </label>

        <div className="modal-actions">
          <button className="button button--secondary" onClick={onClose}>Cancel</button>
          <button className="button button--primary" disabled={!agreed} onClick={() => { onConfirm(); setAgreed(false); }}>
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
