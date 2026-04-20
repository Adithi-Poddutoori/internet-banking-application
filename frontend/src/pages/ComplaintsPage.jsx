import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import api from '../services/api';

const CATEGORIES = [
  'Account issue', 'Transaction dispute', 'Card issue', 'Loan query',
  'Fraud / Unauthorized transaction', 'Technical issue', 'KYC / Documentation',
  'Interest / Charges', 'Other',
];

const STATUS_META = {
  OPEN:        { label: 'Open',        color: '#2563eb', bg: '#eff6ff' },
  IN_PROGRESS: { label: 'In Progress', color: '#d97706', bg: '#fffbeb' },
  RESOLVED:    { label: 'Resolved',    color: '#16a34a', bg: '#f0fdf4' },
};

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [searchComplaints, setSearchComplaints] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [tab, setTab] = useState('list');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ subject: '', category: CATEGORIES[0], description: '', priority: 'NORMAL' });

  const load = async () => {
    try {
      const { data } = await api.get('/complaints/my');
      setComplaints(data?.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submitComplaint = async () => {
    if (!form.subject.trim()) return setToast({ message: 'Enter a subject for your complaint.', type: 'error' });
    if (!form.description.trim()) return setToast({ message: 'Describe your issue.', type: 'error' });
    setSubmitting(true);
    try {
      await api.post('/complaints', {
        subject: `[${form.category}] ${form.subject.trim()}`,
        description: form.description.trim(),
        priority: form.priority,
      });
      setToast({ message: 'Complaint submitted. We will respond within 2-3 business days.', type: 'success' });
      setForm({ subject: '', category: CATEGORIES[0], description: '', priority: 'NORMAL' });
      setTab('list');
      load();
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Failed to submit complaint.', type: 'error' });
    } finally { setSubmitting(false); }
  };

  return (
    <AppShell role="CUSTOMER" title="Raise a Complaint" subtitle="Lodge a complaint and track its resolution status.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        {[['list', `My Complaints (${complaints.length})`], ['new', '+ New Complaint']].map(([key, label]) => (
          <button key={key} className={`tab-bar__tab${tab === key ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* ── NEW COMPLAINT ── */}
      {tab === 'new' && (
        <SectionCard title="Submit a complaint" subtitle="Describe your issue and we'll get back to you.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Category <span style={{ color: 'var(--danger)' }}>*</span></span>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel)' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Subject <span style={{ color: 'var(--danger)' }}>*</span></span>
              <input type="text" placeholder="Brief subject of your complaint" value={form.subject}
                onChange={e => setForm(f => ({...f, subject: e.target.value}))}
                style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem' }} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Description <span style={{ color: 'var(--danger)' }}>*</span></span>
              <textarea rows={5} placeholder="Please describe your issue in detail. Include transaction references, dates, or any relevant information."
                value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Priority</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[['NORMAL', 'Normal', '#2563eb'], ['HIGH', 'High', '#d97706'], ['URGENT', 'Urgent', '#e11d48']].map(([val, label, color]) => (
                  <button key={val} type="button" onClick={() => setForm(f => ({...f, priority: val}))}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: `2px solid ${form.priority === val ? color : 'var(--line)'}`, background: form.priority === val ? color + '18' : 'var(--panel-soft)', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: form.priority === val ? color : 'var(--muted)' }}>
                    {label}
                  </button>
                ))}
              </div>
            </label>

            <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#f0f9ff', border: '1px solid #bae6fd', fontSize: '0.8rem', color: '#0369a1' }}>
              ℹ️ Complaints are reviewed within 2-3 business days. For urgent issues, call <strong>1800-208-1234</strong> (Toll Free, Mon–Sat 9AM–6PM).
            </div>

            <button className="button button--primary" onClick={submitComplaint} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Complaint'}
            </button>
          </div>
        </SectionCard>
      )}

      {/* ── LIST TAB ── */}
      {tab === 'list' && (
        loading ? <div className="empty-state">Loading complaints…</div>
        : complaints.length === 0
          ? <div className="empty-state" style={{ padding: '3rem 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></div>
              <div>No complaints filed yet.</div>
              <button className="button button--primary button--sm" style={{ marginTop: '1rem' }} onClick={() => setTab('new')}>Raise a complaint</button>
            </div>
          : <>
              <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none', opacity: 0.45 }}>🔍</span>
                <input value={searchComplaints} onChange={e => setSearchComplaints(e.target.value)}
                  placeholder="Search by subject, description or status…"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 2.3rem 0.6rem 2.3rem', borderRadius: '10px', border: '1.5px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel-soft)' }} />
                {searchComplaints && <button onClick={() => setSearchComplaints('')} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--muted)', lineHeight: 1 }}>✕</button>}
              </div>
              {(() => {
                const q = searchComplaints.toLowerCase();
                const filtered = complaints.filter(c => !q || c.subject.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q) || c.status.toLowerCase().includes(q));
                if (filtered.length === 0) return <div className="empty-state">No complaints match "{searchComplaints}".</div>;
                return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {filtered.map(c => {
                    const meta = STATUS_META[c.status] || STATUS_META.OPEN;
                    return (
                      <div key={c.id} style={{ padding: '1rem 1.25rem', borderRadius: '12px', border: '1.5px solid var(--line)', background: 'var(--panel)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.subject}</span>
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: meta.color, background: meta.bg, border: `1px solid ${meta.color}44`, borderRadius: '4px', padding: '0.1rem 0.35rem' }}>{meta.label}</span>
                              {c.priority && c.priority !== 'NORMAL' && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: c.priority === 'URGENT' ? '#e11d48' : '#d97706', background: c.priority === 'URGENT' ? '#fef2f2' : '#fffbeb', border: `1px solid ${c.priority === 'URGENT' ? '#fca5a5' : '#fcd34d'}`, borderRadius: '4px', padding: '0.1rem 0.35rem' }}>{c.priority}</span>
                              )}
                            </div>
                            <p style={{ fontSize: '0.83rem', color: 'var(--muted)', marginTop: '0.35rem', lineHeight: 1.5 }}>{c.description}</p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>#{c.id}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Filed: {fmtDate(c.createdAt)}</div>
                            {c.updatedAt && c.updatedAt !== c.createdAt && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Updated: {fmtDate(c.updatedAt)}</div>}
                            {c.adminNote && <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', padding: '0.4rem 0.6rem', borderRadius: '6px', background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', fontWeight: 500 }}>📝 {c.adminNote}</div>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>;
              })()}
            </>
      )}
    </AppShell>
  );
}
