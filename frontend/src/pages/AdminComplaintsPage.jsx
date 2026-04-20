import { useEffect, useState } from 'react';
import { useAutoRefresh } from '../utils/useAutoRefresh';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import api from '../services/api';

const STATUS_META = {
  OPEN:        { label: 'Open',        color: '#2563eb', bg: '#dbeafe' },
  IN_PROGRESS: { label: 'In Progress', color: '#d97706', bg: '#fef3c7' },
  RESOLVED:    { label: 'Resolved',    color: '#16a34a', bg: '#dcfce7' },
};

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [filter, setFilter] = useState('ALL');
  const [updating, setUpdating] = useState(null);
  const [noteInputs, setNoteInputs] = useState({});
  const [searchComplaints, setSearchComplaints] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/complaints/admin');
      setComplaints(data?.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useAutoRefresh(load, 10000);

  const updateStatus = async (id, status, adminNote) => {
    setUpdating(id);
    try {
      await api.put(`/complaints/admin/${id}`, { status, adminNote: adminNote || null });
      setToast({ message: `Complaint #${id} marked as ${status.replace('_', ' ')}.`, type: 'success' });
      load();
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Update failed.', type: 'error' });
    } finally { setUpdating(null); }
  };

  const filtered = complaints.filter(c => {
    const statusMatch = filter === 'ALL' || c.status === filter;
    if (!statusMatch) return false;
    if (!searchComplaints.trim()) return true;
    const q = searchComplaints.toLowerCase();
    return (c.subject || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.customerName || '').toLowerCase().includes(q) ||
      (c.customerUsername || '').toLowerCase().includes(q) ||
      String(c.id).includes(q);
  });

  return (
    <AppShell role="ADMIN" title="Customer Complaints" subtitle="Review and respond to customer complaints.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[['All', complaints.length, '--primary'], ['Open', complaints.filter(c => c.status === 'OPEN').length, '#2563eb'], ['In Progress', complaints.filter(c => c.status === 'IN_PROGRESS').length, '#d97706'], ['Resolved', complaints.filter(c => c.status === 'RESOLVED').length, '#16a34a']].map(([label, count, color]) => (
          <div key={label} style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: 'var(--panel)', border: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => setFilter(label === 'All' ? 'ALL' : label.replace(' ', '_').toUpperCase())}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 500 }}>{label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{count}</div>
          </div>
        ))}
      </div>

      <SectionCard title="Complaints inbox" subtitle={`${filtered.length} complaint(s) — ${filter === 'ALL' ? 'all statuses' : filter.replace('_', ' ')}`}>
        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', opacity: 0.45, pointerEvents: 'none' }}>🔍</span>
          <input value={searchComplaints} onChange={e => setSearchComplaints(e.target.value)}
            placeholder="Search by subject, description, customer name or ID…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 2.3rem', borderRadius: '10px', border: '1.5px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel-soft)' }} />
          {searchComplaints && <button onClick={() => setSearchComplaints('')} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--muted)', lineHeight: 1 }}>✕</button>}
        </div>
        {loading ? (
          <div className="empty-state">Loading complaints…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No complaints found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map(c => {
              const meta = STATUS_META[c.status] || STATUS_META.OPEN;
              const isUpdating = updating === c.id;
              return (
                <div key={c.id} style={{ padding: '1rem 1.25rem', borderRadius: '12px', border: '1.5px solid var(--line)', background: 'var(--panel)' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>#{c.id} · {c.subject}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: meta.color, background: meta.bg, borderRadius: '4px', padding: '0.1rem 0.35rem', border: `1px solid ${meta.color}44` }}>{meta.label}</span>
                        {c.priority && c.priority !== 'NORMAL' && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: c.priority === 'URGENT' ? '#e11d48' : '#d97706', background: c.priority === 'URGENT' ? '#fef2f2' : '#fffbeb', borderRadius: '4px', padding: '0.1rem 0.35rem', border: `1px solid ${c.priority === 'URGENT' ? '#fca5a5' : '#fcd34d'}` }}>{c.priority}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                        By <strong>{c.customerName}</strong> ({c.customerUsername}) · {fmtDate(c.createdAt)}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text)', marginTop: '0.4rem', lineHeight: 1.5 }}>{c.description}</p>
                      {c.adminNote && (
                        <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.75rem', borderRadius: '6px', background: '#f0fdf4', border: '1px solid #86efac', fontSize: '0.8rem', color: '#16a34a', fontWeight: 500 }}>
                          📝 Admin note: {c.adminNote}
                        </div>
                      )}
                    </div>

                    {/* Action panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '200px' }}>
                      <input
                        type="text"
                        placeholder="Admin note (optional)"
                        value={noteInputs[c.id] || c.adminNote || ''}
                        onChange={e => setNoteInputs(p => ({ ...p, [c.id]: e.target.value }))}
                        style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '0.82rem', width: '100%' }}
                      />
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {c.status !== 'IN_PROGRESS' && (
                          <button className="button button--sm button--ghost" style={{ fontSize: '0.75rem' }} disabled={isUpdating}
                            onClick={() => updateStatus(c.id, 'IN_PROGRESS', noteInputs[c.id])}>
                            🔄 In Progress
                          </button>
                        )}
                        {c.status !== 'RESOLVED' && (
                          <button className="button button--sm button--primary" style={{ fontSize: '0.75rem', background: '#16a34a', border: 'none' }} disabled={isUpdating}
                            onClick={() => updateStatus(c.id, 'RESOLVED', noteInputs[c.id])}>
                            ✅ Resolve
                          </button>
                        )}
                        {c.status === 'RESOLVED' && (
                          <button className="button button--sm button--ghost" style={{ fontSize: '0.75rem' }} disabled={isUpdating}
                            onClick={() => updateStatus(c.id, 'OPEN', noteInputs[c.id])}>
                            ↩ Reopen
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </AppShell>
  );
}
