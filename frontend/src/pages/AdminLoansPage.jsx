import { useState, useMemo, useEffect } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import api from '../services/api';

const SETTINGS_KEY  = 'nova_admin_settings';

function ls(key, fb) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fb)); } catch { return fb; }
}
function sw(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function fmtD(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')} ${dt.toLocaleString('en-IN',{month:'short'})} ${dt.getFullYear()}`;
}

const LOAN_TYPES = [
  { title: 'Home Loan',      defaultRate: 8.50  },
  { title: 'Personal Loan',  defaultRate: 12.00 },
  { title: 'Car Loan',       defaultRate: 9.25  },
  { title: 'Education Loan', defaultRate: 7.50  },
  { title: 'Business Loan',  defaultRate: 11.00 },
  { title: 'Gold Loan',      defaultRate: 8.00  },
];

const STATUS_STYLE = {
  APPROVED: { bg: '#f0fdf4', border: '#86efac', text: '#16a34a' },
  DECLINED: { bg: '#fef2f2', border: '#fca5a5', text: '#e11d48' },
};

export default function AdminLoansPage() {
  const [settings, setSettings] = useState(() => ls(SETTINGS_KEY, {}));
  const [toast, setToast]       = useState({ message: '', type: '' });
  const [tab, setTab]           = useState('applications');
  const [search, setSearch]     = useState('');
  const [editRates, setEditRates] = useState(false);
  const [rateEdits, setRateEdits] = useState({});

  // Backend-driven loan data
  const [pendingLoans, setPendingLoans] = useState([]);
  const [loanHistory, setLoanHistory]   = useState([]);
  const [prepayments, setPrepayments]   = useState([]);

  useEffect(() => {
    api.get('/product-requests/admin')
      .then(({ data }) => {
        const all = data?.data || [];
        setPendingLoans(
          all.filter(r => r.status === 'PENDING' && r.category === 'loans')
             .map(r => ({ title: r.productTitle, customerName: r.customerName || '', username: r.customerUsername || '', appliedOn: r.appliedOn }))
        );
        setLoanHistory(
          all.filter(r => r.status !== 'PENDING' && r.category === 'loans')
             .map(r => ({ title: r.productTitle, customerName: r.customerName || '', username: r.customerUsername || '', decision: r.status, decidedOn: r.decidedOn, category: 'loans' }))
        );
      })
      .catch(() => {});
    api.get('/loan-prepayments/admin')
      .then(({ data }) => setPrepayments(data?.data || []))
      .catch(() => {});
  }, []);

  const approvedLoans = useMemo(() =>
    loanHistory.filter(h => h.decision === 'APPROVED').map(h => ({
      title: h.title, name: h.customerName || '—', user: h.username || '', date: h.decidedOn,
    }))
  , [loanHistory]);

  // Backend prepayments have `loanTitle` field; localStorage fallback used `loan`
  const hasPrepayment = (loanTitle) => prepayments.some(p => (p.loanTitle || p.loan || '').includes(loanTitle));
  const defaulters    = useMemo(() => approvedLoans.filter(l => !hasPrepayment(l.title)), [approvedLoans, prepayments]);

  const loanRates = LOAN_TYPES.map(lt => ({
    ...lt,
    rate: settings[`loanRate_${lt.title}`] ?? lt.defaultRate,
  }));

  const saveRates = () => {
    const next = { ...settings, ...rateEdits };
    setSettings(next);
    sw(SETTINGS_KEY, next);
    setEditRates(false);
    setRateEdits({});
    setToast({ message: 'Loan interest rates saved.', type: 'success' });
  };

  const q = search.toLowerCase();
  const filteredPending     = pendingLoans.filter(p => !q || (p.title||'').toLowerCase().includes(q) || (p.customerName||'').toLowerCase().includes(q) || (p.username||'').toLowerCase().includes(q));
  const filteredHistory     = loanHistory.filter(h => !q || (h.title||'').toLowerCase().includes(q) || (h.customerName||'').toLowerCase().includes(q) || (h.decision||'').toLowerCase().includes(q));
  const filteredPrepayments = prepayments.filter(p => !q || (p.loanTitle||p.loan||'').toLowerCase().includes(q) || (p.customerName||'').toLowerCase().includes(q) || String(p.amount || '').includes(search));
  const filteredDefaulters  = defaulters.filter(d => !q || (d.title||'').toLowerCase().includes(q) || (d.name||'').toLowerCase().includes(q));

  const TABS = [
    ['applications', '📋', 'Applications'],
    ['history',      '📜', 'History'],
    ['prepayments',  '💵', 'Prepayments'],
    ['defaulters',   '⚠️', 'Defaulters'],
    ['rates',        '📊', 'Interest Rates'],
  ];

  return (
    <AppShell role="ADMIN" title="Loan Management" subtitle="View applications, track repayments, manage interest rates.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          ['Pending',             pendingLoans.length,                                '#d97706'],
          ['Approved',            loanHistory.filter(h => h.decision === 'APPROVED').length, '#16a34a'],
          ['Declined',            loanHistory.filter(h => h.decision === 'DECLINED').length, '#e11d48'],
          ['Prepayments',         prepayments.length,                                '#2563eb'],
          ['Potential Defaulters',defaulters.length,                                 '#e11d48'],
        ].map(([lbl, val, color]) => (
          <div key={lbl} style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 500, marginBottom: '0.3rem' }}>{lbl}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(([key, icon, label]) => (
          <button key={key} className={`tab-bar__tab${tab === key ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab(key)}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Search (except rates tab) */}
      {tab !== 'rates' && (
        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, customer or username…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 2.3rem', borderRadius: '10px', border: '1.5px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel-soft)' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--muted)' }}>✕</button>}
        </div>
      )}

      {/* Applications */}
      {tab === 'applications' && (
        filteredPending.length === 0 ? (
          <div className="empty-state">No pending loan applications.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredPending.map((p, i) => (
              <div key={(p.appliedOn || '') + i} style={{ padding: '1rem 1.25rem', borderRadius: '12px', border: '1.5px solid #fcd34d', background: '#fffbeb', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>🏦 {p.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                    {p.customerName || '—'}{p.username ? ` (@${p.username})` : ''} · Applied {fmtD(p.appliedOn)}
                  </div>
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#fffbeb', color: '#d97706', border: '1px solid #fcd34d', borderRadius: '4px', padding: '0.2rem 0.5rem' }}>PENDING</span>
              </div>
            ))}
          </div>
        )
      )}

      {/* History */}
      {tab === 'history' && (
        filteredHistory.length === 0 ? (
          <div className="empty-state">No loan decision history.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredHistory.map((h, i) => {
              const sc = STATUS_STYLE[h.decision] || STATUS_STYLE.DECLINED;
              return (
                <div key={(h.decidedOn || '') + i} style={{ padding: '1rem 1.25rem', borderRadius: '12px', border: `1.5px solid ${sc.border}`, background: sc.bg, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>🏦 {h.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                      {h.customerName || '—'}{h.username ? ` (@${h.username})` : ''} · Decided {fmtD(h.decidedOn)}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: sc.text, background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: '4px', padding: '0.2rem 0.5rem' }}>{h.decision}</span>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Prepayments */}
      {tab === 'prepayments' && (
        filteredPrepayments.length === 0 ? (
          <div className="empty-state">No prepayment records found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredPrepayments.map((p, i) => (
              <div key={(p.submittedAt || '') + i} style={{ padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>💵 {p.loanTitle || p.loan || 'Loan Prepayment'}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                    {p.customerName ? `${p.customerName} · ` : ''}{p.customerUsername ? `@${p.customerUsername} · ` : ''}Submitted {fmtD(p.submittedAt)} · Status: {p.status || '—'}
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#16a34a' }}>
                  ₹{Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Defaulters */}
      {tab === 'defaulters' && (
        filteredDefaulters.length === 0 ? (
          <div className="empty-state">No potential defaulters identified.</div>
        ) : (
          <>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fca5a5', marginBottom: '1rem', fontSize: '0.82rem', color: '#991b1b' }}>
              ⚠️ Customers with approved loans and no recorded prepayments are listed as potential defaulters.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredDefaulters.map((d, i) => (
                <div key={d.title + i} style={{ padding: '1rem 1.25rem', borderRadius: '12px', border: '1.5px solid #fca5a5', background: '#fef2f2', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>⚠️ {d.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#991b1b', marginTop: '0.2rem' }}>
                      {d.name}{d.user ? ` (@${d.user})` : ''} · Approved {fmtD(d.date)} · No repayments recorded
                    </div>
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#fef2f2', color: '#e11d48', border: '1px solid #fca5a5', borderRadius: '4px', padding: '0.2rem 0.5rem' }}>DEFAULT RISK</span>
                </div>
              ))}
            </div>
          </>
        )
      )}

      {/* Interest Rates */}
      {tab === 'rates' && (
        <SectionCard title="Loan Interest Rates" subtitle="Rates displayed to customers when applying for loans.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
            {loanRates.map(lr => (
              <div key={lr.title} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--panel)' }}>
                <div style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>🏦 {lr.title}</div>
                {editRates ? (
                  <input type="number" step="0.05" min={1} max={50}
                    defaultValue={lr.rate}
                    onChange={e => setRateEdits(r => ({ ...r, [`loanRate_${lr.title}`]: parseFloat(e.target.value) || lr.defaultRate }))}
                    style={{ width: '90px', padding: '0.4rem 0.6rem', borderRadius: '7px', border: '1px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel)', textAlign: 'right' }} />
                ) : (
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>{lr.rate}% p.a.</div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {editRates ? (
              <>
                <button className="button button--primary" onClick={saveRates}>Save Rates</button>
                <button className="button button--ghost" onClick={() => { setEditRates(false); setRateEdits({}); }}>Cancel</button>
              </>
            ) : (
              <button className="button button--secondary" onClick={() => setEditRates(true)}>✏️ Edit Rates</button>
            )}
          </div>
        </SectionCard>
      )}
    </AppShell>
  );
}
