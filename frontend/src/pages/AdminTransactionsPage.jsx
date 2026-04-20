import { useEffect, useState, useMemo } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import api from '../services/api';

const FLAGGED_KEY = 'nova_admin_flagged_txns';

function ls(key, fb = []) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fb)); } catch { return fb; }
}
function sw(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [filters, setFilters] = useState({ from: '', to: '', account: '', minAmt: '', maxAmt: '' });
  const [flagged, setFlagged] = useState(() => ls(FLAGGED_KEY));
  const [held, setHeld] = useState(() => ls('nova_admin_held_txns'));
  const [search, setSearch] = useState('');
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to)   params.to   = filters.to;
      const { data } = await api.get('/admin/reports/transactions', { params });
      setTransactions(data.data?.transactions || []);
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Unable to load transactions.', type: 'error' });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); 

  const toggleFlag = (id) => {
    const next = flagged.includes(id) ? flagged.filter(f => f !== id) : [...flagged, id];
    setFlagged(next);
    sw(FLAGGED_KEY, next);
    setToast({ message: flagged.includes(id) ? 'Flag removed.' : '🚩 Flagged as suspicious.', type: 'success' });
  };

  const toggleHold = (id) => {
    const next = held.includes(id) ? held.filter(h => h !== id) : [...held, id];
    setHeld(next);
    sw('nova_admin_held_txns', next);
    setToast({ message: held.includes(id) ? 'Hold removed.' : '⏸ Transaction placed on hold.', type: 'success' });
  };

  const displayed = useMemo(() => {
    let list = transactions;
    if (filters.account) list = list.filter(t => (t.accountNumber || '').includes(filters.account));
    if (filters.minAmt)  list = list.filter(t => Number(t.amount) >= Number(filters.minAmt));
    if (filters.maxAmt)  list = list.filter(t => Number(t.amount) <= Number(filters.maxAmt));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        (t.transactionId || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.accountNumber || '').includes(q) ||
        (t.transactionRemarks || '').toLowerCase().includes(q)
      );
    }
    if (showFlaggedOnly) list = list.filter(t => flagged.includes(t.transactionId || String(t.id)));
    return list;
  }, [transactions, filters, search, showFlaggedOnly, flagged]);

  const totalVolume   = useMemo(() => displayed.reduce((s, t) => s + Number(t.amount || 0), 0), [displayed]);
  const flaggedCount  = useMemo(() => transactions.filter(t => flagged.includes(t.transactionId || String(t.id))).length, [transactions, flagged]);
  const heldCount     = useMemo(() => transactions.filter(t => held.includes(t.transactionId || String(t.id))).length, [transactions, held]);

  const statCards = [
    ['Shown', displayed.length, 'var(--primary)'],
    ['Volume', '₹' + Number(totalVolume).toLocaleString('en-IN', { minimumFractionDigits: 2 }), '#16a34a'],
    ['Flagged', flaggedCount, '#f59e0b'],
    ['On Hold', heldCount, '#7c3aed'],
  ];

  return (
    <AppShell role="ADMIN" title="Transaction Monitoring" subtitle="Monitor, filter, flag and hold all bank transactions.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {statCards.map(([lbl, val, color]) => (
          <div key={lbl} style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 500, marginBottom: '0.3rem' }}>{lbl}</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <SectionCard title="Filters" subtitle="Narrow down by date, account, type or amount range.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          {[
            { label: 'From Date', type: 'date', key: 'from' },
            { label: 'To Date',   type: 'date', key: 'to'   },
            { label: 'Account #', type: 'text', key: 'account', placeholder: 'Account number' },
            { label: 'Min Amount ₹', type: 'number', key: 'minAmt', placeholder: '0' },
            { label: 'Max Amount ₹', type: 'number', key: 'maxAmt', placeholder: 'No limit' },
          ].map(f => (
            <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 500 }}>
              {f.label}
              <input
                type={f.type}
                value={filters[f.key]}
                placeholder={f.placeholder || ''}
                onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                style={{ padding: '0.5rem', borderRadius: '7px', border: '1px solid var(--line)', fontSize: '0.85rem', background: 'var(--panel)' }}
              />
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="button button--primary" style={{ fontSize: '0.85rem' }} onClick={load}>Apply Filters</button>
          <button className="button button--ghost" style={{ fontSize: '0.85rem' }}
            onClick={() => { setFilters({ from: '', to: '', account: '', minAmt: '', maxAmt: '' }); setSearch(''); setShowFlaggedOnly(false); load(); }}>
            Reset
          </button>
          <button
            style={{ fontSize: '0.85rem', padding: '0.45rem 1rem', borderRadius: '8px', border: `1.5px solid #f59e0b`, color: showFlaggedOnly ? 'white' : '#f59e0b', background: showFlaggedOnly ? '#f59e0b' : 'transparent', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => setShowFlaggedOnly(p => !p)}>
            🚩 Flagged Only {showFlaggedOnly ? `(${flaggedCount})` : ''}
          </button>
        </div>
      </SectionCard>

      {/* Transaction list */}
      <div style={{ marginTop: '1.5rem' }}>
        <SectionCard title="All Transactions" subtitle={`${displayed.length} transaction(s) displayed`}>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by ID, description, account or remarks…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 2.3rem', borderRadius: '10px', border: '1.5px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel-soft)' }} />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--muted)' }}>✕</button>}
          </div>

          {loading ? (
            <div className="empty-state">Loading transactions…</div>
          ) : displayed.length === 0 ? (
            <div className="empty-state">No transactions match the current filters.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--line)' }}>
                    {['Date', 'Txn ID', 'Account', 'Description', 'Amount', '🚩', '⏸'].map(h => (
                      <th key={h} style={{ padding: '0.55rem 0.7rem', textAlign: h === 'Amount' ? 'right' : ['🚩', '⏸'].includes(h) ? 'center' : 'left', fontWeight: 700, color: 'var(--muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((t, i) => {
                    const id = t.transactionId || String(t.id || i);
                    const isFlagged = flagged.includes(id);
                    const isHeld    = held.includes(id);
                    return (
                      <tr key={id} style={{ borderBottom: '1px solid var(--line)', background: isFlagged ? '#fffbeb' : isHeld ? '#f5f3ff' : 'transparent' }}>
                        <td style={{ padding: '0.5rem 0.7rem', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{fmtDate(t.transactionDate || t.transactionDateAndTime)}</td>
                        <td style={{ padding: '0.5rem 0.7rem', fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{id}</td>
                        <td style={{ padding: '0.5rem 0.7rem', fontFamily: 'monospace', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{t.accountNumber || '—'}</td>
                        <td style={{ padding: '0.5rem 0.7rem', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description || t.transactionRemarks || '—'}</td>
                        <td style={{ padding: '0.5rem 0.7rem', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          ₹{Number(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '0.5rem 0.7rem', textAlign: 'center' }}>
                          <button onClick={() => toggleFlag(id)} title={isFlagged ? 'Remove flag' : 'Flag suspicious'}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: isFlagged ? 1 : 0.25, transition: 'opacity 0.15s' }}>🚩</button>
                        </td>
                        <td style={{ padding: '0.5rem 0.7rem', textAlign: 'center' }}>
                          <button onClick={() => toggleHold(id)} title={isHeld ? 'Release hold' : 'Place on hold'}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: isHeld ? 1 : 0.25, transition: 'opacity 0.15s' }}>⏸</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
