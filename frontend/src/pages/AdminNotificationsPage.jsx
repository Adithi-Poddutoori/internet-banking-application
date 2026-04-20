import { useState, useMemo, useEffect } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import api from '../services/api';

function fmtD(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const TYPE_META = {
  info:        { label: 'Info',        color: '#2563eb', bg: '#eff6ff', border: '#93c5fd', icon: 'ℹ️' },
  warning:     { label: 'Warning',     color: '#d97706', bg: '#fffbeb', border: '#fcd34d', icon: '⚠️' },
  alert:       { label: 'Alert',       color: '#e11d48', bg: '#fef2f2', border: '#fca5a5', icon: '🚨' },
  promotional: { label: 'Promotional', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', icon: '🎁' },
  maintenance: { label: 'Maintenance', color: '#64748b', bg: '#f8fafc', border: '#cbd5e1', icon: '🔧' },
};

export default function AdminNotificationsPage() {
  const [broadcasts, setBroadcasts] = useState([]);

  useEffect(() => {
    api.get('/admin-broadcasts').then(r => setBroadcasts(r.data?.data || [])).catch(() => {});
  }, []);
  const [toast, setToast]           = useState({ message: '', type: '' });
  const [tab, setTab]               = useState('compose');
  const [form, setForm]             = useState({ title: '', message: '', type: 'info', target: 'all', accountNumber: '' });
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [deleteId, setDeleteId]     = useState(null);

  const patchForm = (patch) => setForm(f => ({ ...f, ...patch }));

  const send = () => {
    if (!form.title.trim())   return setToast({ message: 'Enter a notification title.', type: 'error' });
    if (!form.message.trim()) return setToast({ message: 'Enter a notification message.', type: 'error' });
    if (form.target === 'specific' && !form.accountNumber.trim())
      return setToast({ message: 'Enter the target account number.', type: 'error' });

    const payload = {
      title:         form.title.trim(),
      message:       form.message.trim(),
      type:          form.type,
      target:        form.target,
      accountNumber: form.target === 'specific' ? form.accountNumber.trim() : '',
    };
    api.post('/admin-broadcasts', payload).then(r => {
      setBroadcasts(prev => [r.data.data, ...prev]);
      const dest = form.target === 'specific' ? ` to account ${form.accountNumber.trim()}` : ' to all users';
      setToast({ message: `Notification sent${dest}.`, type: 'success' });
      setForm({ title: '', message: '', type: 'info', target: 'all', accountNumber: '' });
      setTab('history');
    }).catch(e => setToast({ message: e.response?.data?.message || 'Failed to send notification.', type: 'error' }));
  };

  const confirmDelete = (id) => {
    api.delete(`/admin-broadcasts/${id}`).then(() => {
      setBroadcasts(prev => prev.filter(b => b.id !== id));
      setDeleteId(null);
      setToast({ message: 'Notification removed from history.', type: 'success' });
    }).catch(e => setToast({ message: e.response?.data?.message || 'Delete failed.', type: 'error' }));
  };

  const filtered = useMemo(() => {
    let list = broadcasts;
    if (filterType !== 'ALL') list = list.filter(b => b.type === filterType);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        (b.title || '').toLowerCase().includes(q) ||
        (b.message || '').toLowerCase().includes(q) ||
        (b.accountNumber || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [broadcasts, filterType, search]);

  const inputStyle = { padding: '0.55rem', borderRadius: '7px', border: '1px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel)', fontFamily: 'inherit' };

  return (
    <AppShell role="ADMIN" title="Notifications Management" subtitle="Compose and send announcements and alerts to customers.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          ['Total Sent',  broadcasts.length,                                      'var(--primary)'],
          ['To All',      broadcasts.filter(b => b.target === 'all').length,      '#2563eb'],
          ['Targeted',    broadcasts.filter(b => b.target === 'specific').length, '#7c3aed'],
          ['Alerts',      broadcasts.filter(b => b.type === 'alert').length,      '#e11d48'],
          ['Maintenance', broadcasts.filter(b => b.type === 'maintenance').length,'#64748b'],
        ].map(([lbl, val, color]) => (
          <div key={lbl} style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 500, marginBottom: '0.3rem' }}>{lbl}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        {[['compose', 'Compose'], ['history', `History (${broadcasts.length})`]].map(([key, label]) => (
          <button key={key} className={`tab-bar__tab${tab === key ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* Compose */}
      {tab === 'compose' && (
        <SectionCard title="Compose Notification" subtitle="Send an announcement or alert to all users or a specific customer.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Notification Type
                <select value={form.type} onChange={e => patchForm({ type: e.target.value })} style={inputStyle}>
                  {Object.entries(TYPE_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Send To
                <select value={form.target} onChange={e => patchForm({ target: e.target.value, accountNumber: '' })} style={inputStyle}>
                  <option value="all">🌐 All Users</option>
                  <option value="specific">👤 Specific User</option>
                </select>
              </label>
            </div>

            {form.target === 'specific' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Target Account Number
                <input value={form.accountNumber} onChange={e => patchForm({ accountNumber: e.target.value })}
                  placeholder="Enter customer account number" style={inputStyle} />
              </label>
            )}

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Title
              <input value={form.title} onChange={e => patchForm({ title: e.target.value })}
                placeholder="Notification title" style={inputStyle} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Message
              <textarea value={form.message} onChange={e => patchForm({ message: e.target.value })}
                placeholder="Write your notification message here…" rows={4}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </label>

            {/* Live preview */}
            {(form.title || form.message) && (
              <div style={{ padding: '0.9rem 1rem', borderRadius: '10px', border: `1.5px solid ${TYPE_META[form.type].border}`, background: TYPE_META[form.type].bg }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: TYPE_META[form.type].color, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {TYPE_META[form.type].icon} {TYPE_META[form.type].label} — Preview
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{form.title || '(no title)'}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{form.message || '(no message)'}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="button button--primary" onClick={send}> Send Notification</button>
              <button className="button button--ghost" onClick={() => setForm({ title: '', message: '', type: 'info', target: 'all', accountNumber: '' })}>Clear</button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* History */}
      {tab === 'history' && (
        <>
          {/* Type filter chips */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {['ALL', ...Object.keys(TYPE_META)].map(k => {
              const meta = TYPE_META[k];
              const active = filterType === k;
              return (
                <button key={k} onClick={() => setFilterType(k)}
                  style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', border: `1.5px solid ${active ? (meta?.border || 'var(--primary)') : 'var(--line)'}`, background: active ? (meta?.bg || 'var(--panel-soft)') : 'transparent', color: active ? (meta?.color || 'var(--primary)') : 'var(--muted)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                  {k === 'ALL' ? '📋 All' : `${meta.icon} ${meta.label}`}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
            <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notifications by title, message or username…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 2.3rem', borderRadius: '10px', border: '1.5px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel-soft)' }} />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--muted)' }}>✕</button>}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">No notifications sent yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filtered.map(b => {
                const meta = TYPE_META[b.type] || TYPE_META.info;
                return (
                  <div key={b.id} style={{ padding: '1rem 1.25rem', borderRadius: '12px', border: `1.5px solid ${meta.border}`, background: meta.bg, display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{meta.icon}</div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{b.title}</span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: meta.color, background: 'white', border: `1px solid ${meta.border}`, borderRadius: '4px', padding: '0.1rem 0.4rem' }}>{meta.label.toUpperCase()}</span>
                        {b.target === 'specific' ? (
                          <span style={{ fontSize: '0.6rem', fontWeight: 600, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>{b.accountNumber}</span>
                        ) : (
                          <span style={{ fontSize: '0.6rem', fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>All Users</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>{b.message}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Sent {fmtD(b.sentAt)}</div>
                    </div>
                    <button onClick={() => setDeleteId(b.id)} title="Remove notification"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e11d48', fontSize: '1rem', flexShrink: 0, padding: '0.2rem', opacity: 0.7 }}>🗑</button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '360px' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Delete notification?</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>This will remove it from the history. This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button className="button button--ghost" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="button button--danger" onClick={() => confirmDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
