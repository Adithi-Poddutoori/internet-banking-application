import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import api from '../services/api';

const EMPTY_FORM = { adminName: '', adminEmailId: '', adminContact: '', username: '', password: '' };

function TH(h) {
  return <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>{h}</th>;
}

export default function AdminStaffPage() {
  const [staff, setStaff] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('staff'); // 'staff' | 'history'
  const [toast, setToast] = useState({ message: '', type: '' });
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');

  // Add / Edit modal
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit'
  const [modalTarget, setModalTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    try {
      const [sr, lr] = await Promise.all([
        api.get('/admin/staff'),
        api.get('/admin/staff/logs'),
      ]);
      setStaff(sr.data?.data || []);
      setLogs(lr.data?.data || []);
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Failed to load staff data.', type: 'error' });
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setModalMode('add');
    setModalTarget(null);
  };

  const openEdit = (member) => {
    setForm({ adminName: member.adminName, adminEmailId: member.adminEmailId, adminContact: member.adminContact, username: member.username, password: '' });
    setModalMode('edit');
    setModalTarget(member);
  };

  const saveForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modalMode === 'add') {
        await api.post('/admin/staff', form);
        setToast({ message: `Admin "${form.adminName}" created successfully.`, type: 'success' });
      } else {
        await api.put(`/admin/staff/${modalTarget.id}`, form);
        setToast({ message: `Admin "${form.adminName}" updated successfully.`, type: 'success' });
      }
      setModalMode(null);
      load();
    } catch (e2) {
      setToast({ message: e2.response?.data?.message || 'Operation failed.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/admin/staff/${deleteTarget.id}`);
      setToast({ message: `${deleteTarget.adminName} has been removed.`, type: 'success' });
      setDeleteTarget(null);
      load();
    } catch (e2) {
      setToast({ message: e2.response?.data?.message || 'Delete failed.', type: 'error' });
    }
  };

  const searchById = async () => {
    const id = searchId.trim();
    setSearchResult(null);
    setSearchError('');
    if (!id) return;
    try {
      const r = await api.get(`/admin/staff/${id}`);
      setSearchResult(r.data?.data);
    } catch (e2) {
      setSearchError(e2.response?.data?.message || `No admin found with ID "${id}".`);
    }
  };

  const LOG_COLOR = { CREATED: '#16a34a', UPDATED: '#2563eb', DELETED: '#e11d48' };
  const LOG_ICON  = { CREATED: '', UPDATED: '', DELETED: '' };

  return (
    <AppShell role="ADMIN" title="Staff Management" subtitle="Manage admin accounts and view change history.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* ── Tab bar ── */}
      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        {[['staff', 'Staff Members'], ['history', 'Change History']].map(([key, label]) => (
          <button key={key} className={`tab-bar__tab${tab === key ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* ══ STAFF TAB ══ */}
      {tab === 'staff' && (
        <div>
          {/* Staff list */}
          <SectionCard
            title={`All Staff (${staff.length})`}
            subtitle="All admin and employee accounts registered in the system."
            actions={<button className="button button--secondary" onClick={openAdd}>+ Add Staff</button>}
          >
            {/* Search bar */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="number"
                placeholder="Search by Admin ID…"
                value={searchId}
                onChange={e => { setSearchId(e.target.value); setSearchResult(null); setSearchError(''); }}
                onKeyDown={e => e.key === 'Enter' && searchById()}
                style={{ flex: '1', minWidth: '180px', maxWidth: '280px' }}
              />
              <button className="button button--secondary" onClick={searchById}>Search</button>
              {(searchResult || searchError) && (
                <button className="button button--ghost" onClick={() => { setSearchResult(null); setSearchError(''); setSearchId(''); }}>Clear</button>
              )}
            </div>
            {searchError && <div className="empty-state" style={{ color: '#e11d48', marginBottom: '0.5rem' }}>{searchError}</div>}
            {searchResult && (
              <div className="list-item" style={{ marginBottom: '0.75rem' }}>
                <div>
                  <strong>{searchResult.adminName}</strong>
                  <span>@{searchResult.username} · {searchResult.adminEmailId} · {searchResult.adminContact}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="pill">{searchResult.role}</span>
                  <button className="button button--sm button--ghost" onClick={() => openEdit(searchResult)}>Edit</button>
                </div>
              </div>
            )}
            {staff.length === 0 ? (
              <div className="empty-state">No staff members found.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['ID', 'Name', 'Username', 'Email', 'Contact', 'Role', 'Joined', 'Actions'].map(TH)}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(m => (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', color: 'var(--muted)' }}>#{m.id}</td>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{m.adminName}</td>
                        <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace' }}>@{m.username}</td>
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>{m.adminEmailId}</td>
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>{m.adminContact}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}><span className="pill">{m.role}</span></td>
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)', fontSize: '0.8rem' }}>
                          {m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button className="button button--sm button--ghost" onClick={() => openEdit(m)}>Edit</button>
                            <button className="button button--sm button--ghost-danger" onClick={() => setDeleteTarget(m)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ══ HISTORY TAB ══ */}
      {tab === 'history' && (
        <div className="content-grid content-grid--wide">
          <SectionCard title="Change History" subtitle={`${logs.length} recorded action(s) on admin accounts.`}>
            {logs.length === 0 ? (
              <div className="empty-state">No history recorded yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['Time', 'Action', 'Target', 'Performed By', 'Details'].map(TH)}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(l => (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          {new Date(l.performedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: LOG_COLOR[l.action] || '#666', whiteSpace: 'nowrap' }}>
                          {LOG_ICON[l.action] || '•'} {l.action}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          <strong>{l.targetAdminName}</strong>
                          <br /><span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>@{l.targetUsername} · ID #{l.targetAdminId}</span>
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', color: 'var(--muted)' }}>@{l.performedBy}</td>
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)', fontSize: '0.82rem' }}>{l.details || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      {modalMode && (
        <div className="modal-overlay" onClick={() => setModalMode(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>{modalMode === 'add' ? '➕ Add Staff Member' : '✏️ Edit Staff Member'}</h3>
            <form className="stack-form" onSubmit={saveForm}>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Full Name</label>
              <input placeholder="Full name" value={form.adminName} onChange={e => setForm(p => ({ ...p, adminName: e.target.value }))} required />
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Email Address</label>
              <input type="email" placeholder="Email address" value={form.adminEmailId} onChange={e => setForm(p => ({ ...p, adminEmailId: e.target.value }))} required />
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Contact Number</label>
              <input placeholder="Contact number" value={form.adminContact} onChange={e => setForm(p => ({ ...p, adminContact: e.target.value }))} required />
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Username</label>
              <input placeholder="Username (login)" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required disabled={modalMode === 'edit'} style={modalMode === 'edit' ? { opacity: 0.6 } : {}} />
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>
                Password {modalMode === 'edit' && <span style={{ fontWeight: 400 }}>(leave blank to keep current)</span>}
              </label>
              <input type="password" placeholder={modalMode === 'add' ? 'Set password' : 'New password (optional)'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required={modalMode === 'add'} />
              <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
                <button type="button" className="button button--ghost" onClick={() => setModalMode(null)}>Cancel</button>
                <button type="submit" className="button button--secondary" disabled={saving}>
                  {saving ? 'Saving…' : modalMode === 'add' ? 'Create Account' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Remove Staff Member</h3>
            <p style={{ margin: '0.75rem 0' }}>
              Are you sure you want to remove <strong>{deleteTarget.adminName}</strong> (@{deleteTarget.username})?
              Their account will be deactivated and locked.
            </p>
            <div className="modal-actions">
              <button className="button button--ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="button button--ghost-danger" onClick={confirmDelete}>Remove Staff</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
