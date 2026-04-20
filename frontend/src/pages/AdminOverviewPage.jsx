import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import TransactionsTable from '../components/TransactionsTable';
import Toast from '../components/Toast';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';

const FLAGGED_KEY  = 'nova_admin_flagged_txns';

function lsRead(key, fb) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fb)); } catch { return fb; }
}

/* Premium animated bar chart */
function BarChart({ data, height = 110 }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const peakIdx = data.reduce((pi, d, i) => d.value > data[pi].value ? i : pi, 0);
  return (
    <div style={{ padding: '0.5rem 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: height + 24 }}>
        {data.map((d, i) => {
          const pct = d.value / max;
          const isPeak = i === peakIdx;
          const barH = Math.max(pct * height, d.value > 0 ? 3 : 0);
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                {isPeak && d.value > 0 && (
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '3px', background: 'var(--primary-soft, #eff6ff)', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>{d.value}</div>
                )}
                <div title={`${d.label}: ${d.value} txns`} style={{
                  width: '100%',
                  height: mounted ? `${barH}px` : '0px',
                  background: isPeak
                    ? 'linear-gradient(180deg, var(--primary) 0%, #3b82f6 100%)'
                    : 'linear-gradient(180deg, #93c5fd 0%, #bfdbfe 100%)',
                  borderRadius: '5px 5px 0 0',
                  transition: 'height 0.7s cubic-bezier(0.34,1.56,0.64,1)',
                  boxShadow: isPeak ? '0 -2px 8px rgba(59,130,246,0.35)' : 'none',
                }} />
              </div>
              <div style={{ fontSize: '0.6rem', whiteSpace: 'nowrap', fontWeight: isPeak ? 700 : 400, color: isPeak ? 'var(--primary)' : 'var(--muted)' }}>{d.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--line)' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Peak: <strong style={{ color: 'var(--text)' }}>{data[peakIdx]?.label}</strong></span>
        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Total: <strong style={{ color: 'var(--text)' }}>{data.reduce((s, d) => s + d.value, 0)} txns</strong></span>
      </div>
    </div>
  );
}

/* Mini donut ring using SVG */
function DonutRing({ value, max, color, size = 64, strokeWidth = 8 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [recentTxns, setRecentTxns] = useState([]);
  const [toast, setToast]     = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(true);

  /* localStorage-derived counters */
  const flaggedCount    = lsRead(FLAGGED_KEY, []).length;
  const pendingLoans    = (lsRead('novabank_products', {})['loans'] || []).length;
  const broadcasts      = lsRead('nova_admin_broadcasts', []).length;
  const claimsPending   = lsRead('nova_insurance_claims', []).filter(c => c.status === 'PENDING').length;
  const autopayBills    = lsRead('nova_bills', []).filter(b => b.autopay).length;

  useEffect(() => {
    (async () => {
      try {
        const [dashRes, txnRes] = await Promise.allSettled([
          api.get('/admin/dashboard'),
          api.get('/admin/reports/transactions'),
        ]);
        if (dashRes.status === 'fulfilled') setDashboard(dashRes.value.data.data);
        if (txnRes.status  === 'fulfilled') setRecentTxns(txnRes.value.data.data?.transactions || []);
      } catch (e) {
        setToast({ message: e.response?.data?.message || 'Unable to load dashboard.', type: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    if (!dashboard) return [];
    return [
      ['Pending Approvals', String(dashboard.pendingRequests ?? '—'), 'Applications awaiting review'],
      ['Active Customers',  String(dashboard.activeCustomers  ?? '—'), 'Approved retail profiles'],
      ['Active Accounts',   String(dashboard.activeAccounts   ?? '—'), 'Savings and term accounts'],
      ['Total Deposits',    formatCurrency(dashboard.totalDeposits ?? 0), 'Current account balances'],
    ];
  }, [dashboard]);

  /* Build last-7-days transaction bar chart data from recentTxns */
  const txnChartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3);
      const count = recentTxns.filter(t => {
        const td = (t.transactionDate || t.transactionDateAndTime || '').slice(0, 10);
        return td === key;
      }).length;
      days.push({ label, value: count });
    }
    return days;
  }, [recentTxns]);

  const quickActions = [
    { icon: '✅', label: 'Approvals',     path: '/admin/approvals' },
    { icon: '👥', label: 'Customers',     path: '/admin/customers' },
    { icon: '📢', label: 'Complaints',    path: '/admin/complaints' },
    { icon: '🔀', label: 'Transactions',  path: '/admin/transactions' },
    { icon: '🔔', label: 'Notifications', path: '/admin/notifications' },
    { icon: '⚙️', label: 'Settings',      path: '/admin/settings' },
  ];

  return (
    <AppShell role="ADMIN" title="Admin Dashboard" subtitle="Executive summary, live analytics and quick navigation.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* Primary stats */}
      <div className="stats-grid">
        {loading
          ? [1,2,3,4].map(i => <StatCard key={i} label="…" value="—" helper="" />)
          : stats.map(([label, value, helper]) => <StatCard key={label} label={label} value={value} helper={helper} />)
        }
      </div>

      {/* Additional live counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
        {[
          ['🚩 Flagged Txns',       flaggedCount,    '#f59e0b'],
          ['🏦 Pending Loans',      pendingLoans,    '#d97706'],
          ['🔔 Broadcasts',         broadcasts,      '#7c3aed'],
          ['🛡️ Claims Pending',   claimsPending,   '#e11d48'],
          ['⚡ AutoPay Bills',       autopayBills,    '#16a34a'],
          ['� Total Volume',  '₹' + recentTxns.reduce((s, t) => s + Number(t.amount || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }), '#0ea5e9'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ padding: '0.9rem 1.1rem', borderRadius: '12px', background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 500, marginBottom: '0.25rem' }}>{label}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="content-grid content-grid--wide" style={{ marginBottom: '1.5rem' }}>
        <SectionCard title="Transaction Activity" subtitle="Transactions per day — last 7 days">
          {recentTxns.length > 0
            ? <BarChart data={txnChartData} height={110} />
            : <div className="empty-state" style={{ padding: '2rem 0', fontSize: '0.85rem' }}>No recent transaction data.</div>
          }
        </SectionCard>

        <SectionCard title="Credit vs Debit" subtitle="Volume split from recent transactions.">
          {(() => {
            const CREDIT_TYPES = ['DEPOSIT', 'TRANSFER_IN', 'INTEREST_CREDIT', 'ACCOUNT_OPENING'];
            const credits = recentTxns.filter(t => CREDIT_TYPES.includes(t.type)).reduce((s, t) => s + Number(t.amount || 0), 0);
            const debits  = recentTxns.filter(t => !CREDIT_TYPES.includes(t.type)).reduce((s, t) => s + Number(t.amount || 0), 0);
            const total   = credits + debits || 1;
            const creditPct = credits / total;
            const debitPct  = debits / total;
            const SIZE = 140;
            const SW   = 16;
            const R    = (SIZE - SW) / 2;
            const CIRC = 2 * Math.PI * R;
            const cx = SIZE / 2, cy = SIZE / 2;
            const creditDash = creditPct * CIRC;
            const debitDash  = debitPct  * CIRC;
            const debitOffset = -creditDash;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '0.75rem 0' }}>
                {/* Donut */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <svg width={SIZE} height={SIZE}>
                    <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--line)" strokeWidth={SW} />
                    {credits > 0 && (
                      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#22c55e" strokeWidth={SW}
                        strokeDasharray={`${creditDash} ${CIRC}`} strokeLinecap="butt"
                        transform={`rotate(-90 ${cx} ${cy})`} style={{ filter: 'drop-shadow(0 0 4px rgba(34,197,94,.4))' }} />
                    )}
                    {debits > 0 && (
                      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f43f5e" strokeWidth={SW}
                        strokeDasharray={`${debitDash} ${CIRC}`} strokeDashoffset={debitOffset} strokeLinecap="butt"
                        transform={`rotate(-90 ${cx} ${cy})`} style={{ filter: 'drop-shadow(0 0 4px rgba(244,63,94,.35))' }} />
                    )}
                    <text x={cx} y={cy - 9} textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--text)">{recentTxns.length}</text>
                    <text x={cx} y={cy + 8} textAnchor="middle" fontSize="9.5" fontWeight="500" fill="var(--muted)">transactions</text>
                  </svg>
                </div>
                {/* Legend */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {[['Credits', credits, creditPct, '#22c55e', '#f0fdf4', '#bbf7d0'], ['Debits', debits, debitPct, '#f43f5e', '#fff1f2', '#fecdd3']].map(([label, val, pct, color, bg, border]) => (
                    <div key={label} style={{ padding: '0.55rem 0.75rem', borderRadius: '10px', background: bg, border: `1px solid ${border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span style={{ fontWeight: 700, fontSize: '0.78rem', color }}>{label}</span>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '0.78rem', color }}>{Math.round(pct * 100)}%</span>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>{formatCurrency(val)}</div>
                      <div style={{ marginTop: '0.35rem', height: '3px', borderRadius: '2px', background: border }}>
                        <div style={{ height: '100%', width: `${Math.round(pct * 100)}%`, background: color, borderRadius: '2px', transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </SectionCard>
      </div>

      {/* Quick actions */}
      <SectionCard title="Quick Actions" subtitle="Navigate to any admin section.">
        <div className="quick-actions">
          {quickActions.map(action => (
            <button key={action.label} className="quick-action-btn" onClick={() => navigate(action.path)}>
              <div className="quick-action-btn__icon">{action.icon}</div>
              <div className="quick-action-btn__label">{action.label}</div>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Recent transactions feed */}
      <SectionCard title="Recent Operations Feed" subtitle="Latest transaction activity across the bank." style={{ marginTop: '1.5rem' }}>
        {loading
          ? <div className="empty-state">Loading…</div>
          : <TransactionsTable rows={recentTxns.slice(0, 20)} />
        }
      </SectionCard>
    </AppShell>
  );
}
