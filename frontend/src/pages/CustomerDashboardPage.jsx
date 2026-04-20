import { useEffect, useMemo, useState } from 'react';
import { useAutoRefresh } from '../utils/useAutoRefresh';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import TransactionsTable from '../components/TransactionsTable';
import Toast from '../components/Toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { getPrimaryAccount } from '../utils/primaryAccount';
import { getProductHistory, getStoppedInvestments } from '../utils/products';

function getCreditScore(accounts, transactions) {
  let score = 600;
  score += Math.min(accounts.length * 10, 30);
  const totalBal = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  if (totalBal >= 100000) score += 50;
  else if (totalBal >= 25000) score += 30;
  else if (totalBal >= 5000) score += 15;
  const loanHistory = getProductHistory().filter(h => h.category === 'loans');
  score += loanHistory.filter(h => h.decision === 'APPROVED').length * 15;
  score -= loanHistory.filter(h => h.decision === 'DECLINED').length * 20;
  const creditTxns = (transactions || []).filter(t => ['DEPOSIT','TRANSFER_IN','INTEREST_CREDIT'].includes(t.transactionType));
  const debitTxns  = (transactions || []).filter(t => ['WITHDRAWAL','TRANSFER_OUT','NEFT','IMPS','RTGS'].includes(t.transactionType));
  score += Math.min(creditTxns.length * 2, 40);
  if (debitTxns.length > creditTxns.length * 2) score -= 20;
  return Math.min(900, Math.max(300, score));
}

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [recentTxns, setRecentTxns] = useState([]);

  const load = async () => {
    try {
      const { data } = await api.get('/customers/dashboard');
      setDashboard(data.data);
      try {
        const txnRes = await api.get('/transactions');
        setRecentTxns(txnRes.data?.data || []);
      } catch { /* non-critical */ }
    } catch (e) {
      if (e.response?.status !== 403) {
        setToast({ message: e.response?.data?.message || 'Unable to load dashboard.', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useAutoRefresh(load, 30000);

  const totals = useMemo(() => {
    const accounts = dashboard?.accounts || [];
    return accounts.reduce(
      (acc, a) => ({ balance: acc.balance + Number(a.balance || 0), interest: acc.interest + Number(a.estimatedInterest || 0) }),
      { balance: 0, interest: 0 }
    );
  }, [dashboard]);

  const cibilScore = useMemo(() => getCreditScore(dashboard?.accounts || [], recentTxns), [dashboard, recentTxns]);
  const cibilColor = cibilScore >= 750 ? '#16a34a' : cibilScore >= 700 ? '#65a30d' : cibilScore >= 650 ? '#d97706' : cibilScore >= 600 ? '#f97316' : '#e11d48';
  const cibilLabel = cibilScore >= 750 ? 'Excellent' : cibilScore >= 700 ? 'Good' : cibilScore >= 650 ? 'Fair' : cibilScore >= 600 ? 'Average' : 'Poor';

  const ALL_RECOMMENDATIONS = useMemo(() => {
    const hist = getProductHistory();
    const approvedCats = new Set(hist.filter(h => h.decision === 'APPROVED').map(h => h.category));
    const stopped = getStoppedInvestments();
    const hasApprovedInv = hist.filter(h => h.category === 'investments' && h.decision === 'APPROVED' && !stopped.includes(h.title)).length > 0;
    const recs = [];
    if (!approvedCats.has('cards'))       recs.push({ icon: '', title: 'Apply for a Credit Card', desc: 'Enjoy cashback, rewards and zero-fee EMIs on purchases.', tag: 'Cards', path: '/customer/cards', color: '#7c3aed', tagBg: '#f5f3ff' });
    if (!approvedCats.has('loans'))       recs.push({ icon: '', title: 'Home / Personal Loan', desc: 'Quick disbursals at competitive rates. Check your eligibility now.', tag: 'Loans', path: '/customer/loans', color: '#0891b2', tagBg: '#ecfeff' });
    if (!approvedCats.has('investments') || !hasApprovedInv)
                                           recs.push({ icon: '', title: 'Start Investing Today', desc: 'SIPs from ₹500/month. Build wealth with mutual funds, NPS and more.', tag: 'Investments', path: '/customer/investments', color: '#16a34a', tagBg: '#f0fdf4' });
    if (!approvedCats.has('insurance'))   recs.push({ icon: '', title: 'Protect What Matters', desc: 'Term, health and life insurance plans starting at ₹499/year.', tag: 'Insurance', path: '/customer/insurance', color: '#d97706', tagBg: '#fffbeb' });
    if (!approvedCats.has('deposits'))    recs.push({ icon: '', title: 'Open a Fixed Deposit', desc: 'Earn up to 7.5% p.a. with zero risk. Start with ₹1,000.', tag: 'Deposits', path: '/customer/deposits', color: '#2563eb', tagBg: '#eff6ff' });
    // Always suggest bills autopay
    recs.push({ icon: '', title: 'Set Up AutoPay for Bills', desc: 'Never miss a payment — automate electricity, mobile, and more.', tag: 'Bills', path: '/customer/bills', color: '#f59e0b', tagBg: '#fef9c3' });
    return recs.slice(0, 4);
  }, [dashboard]);

  const quickActions = [
    { icon: '💸', label: 'Transfer', path: '/customer/transfer' },
    { icon: '💳', label: 'Cards', path: '/customer/cards' },
    { icon: '🧾', label: 'Bills', path: '/customer/bills' },
    { icon: '📊', label: 'Expenses', path: '/customer/expenses' },
    { icon: '📢', label: 'Complaints', path: '/customer/complaints' },
  ];

  return (
    <AppShell role="CUSTOMER" title="Customer Dashboard" subtitle="Overview of your banking relationship with Nova Bank.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* Pending approval banner */}
      {dashboard?.status === 'PENDING' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', padding: '1rem 1.25rem', borderRadius: '12px', background: '#fefce8', border: '1.5px solid #fbbf24', marginBottom: '0.5rem', boxShadow: '0 2px 8px #fbbf2418' }}>
          <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>⏳</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#92400e' }}>Account pending admin approval</div>
            <div style={{ fontSize: 'var(--fs-sm)', color: '#78350f', marginTop: '0.2rem' }}>Your application has been submitted and is awaiting review. Some features are restricted until your account is approved. You will receive your login credentials by post once approved.</div>
          </div>
        </div>
      )}

      <div className="profile-strip">
        <div className="profile-strip__avatar">{(user?.displayName || user?.username || 'U').slice(0, 1)}</div>
        <div>
          <div className="profile-strip__name">Welcome, {user?.displayName || user?.username}</div>
          <div className="profile-strip__meta">Account holder • {user?.username}</div>
        </div>
      </div>

      <SectionCard title="Quick actions" subtitle="Navigate to commonly used banking services.">
        <div className="quick-actions">
          {quickActions.map(action => (
            <button key={action.label} className="quick-action-btn" onClick={() => navigate(action.path)}>
              <div className="quick-action-btn__icon">{action.icon}</div>
              <div className="quick-action-btn__label">{action.label}</div>
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="stats-grid">
        <StatCard label="Portfolio balance" value={formatCurrency(totals.balance)} helper="Across all linked accounts" />
        <StatCard label="Projected interest" value={formatCurrency(totals.interest)} helper="Current estimated earnings" />
        <StatCard label="Beneficiaries" value={String(dashboard?.beneficiaries?.length || 0)} helper="Saved transfer profiles" />
        <StatCard label="Nominees" value={String(dashboard?.nominees?.length || 0)} helper="Linked legal nominees" />
      </div>

      {/* Nova Credit Score Banner */}
      <div
        onClick={() => navigate('/customer/credit-score')}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1rem 1.25rem', borderRadius: '14px', background: 'var(--panel)', border: `2px solid ${cibilColor}33`, boxShadow: 'var(--shadow)', marginBottom: '0.25rem' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', border: `3px solid ${cibilColor}`, background: `${cibilColor}15`, flexShrink: 0 }}>
          <span style={{ fontSize: '1.3rem', fontWeight: 900, color: cibilColor, lineHeight: 1 }}>{cibilScore}</span>
          <span style={{ fontSize: '0.55rem', fontWeight: 700, color: cibilColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>SCORE</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.15rem' }}>Nova Credit Score — <span style={{ color: cibilColor }}>{cibilLabel}</span></div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Your internal bank score based on account & transaction activity · Separate from CIBIL bureau</div>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, flexShrink: 0 }}>View details →</div>
      </div>

      {/* Recommendations */}
      {ALL_RECOMMENDATIONS.length > 0 && (
        <SectionCard title="Recommended for you" subtitle="Personalised products and services based on your banking profile.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.85rem' }}>
            {ALL_RECOMMENDATIONS.map(rec => (
              <div
                key={rec.title}
                onClick={() => navigate(rec.path)}
                style={{ cursor: 'pointer', padding: '1rem 1.1rem', borderRadius: '12px', background: rec.tagBg, border: `1.5px solid ${rec.color}22`, transition: 'box-shadow 0.15s', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 16px ${rec.color}22`}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>{rec.icon}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, background: rec.color, color: '#fff', padding: '0.1rem 0.45rem', borderRadius: '20px', letterSpacing: '0.03em' }}>{rec.tag}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: rec.color }}>{rec.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: '1.4' }}>{rec.desc}</div>
                <div style={{ fontSize: '0.75rem', color: rec.color, fontWeight: 600, marginTop: '0.2rem' }}>Explore →</div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Recent transactions" subtitle="Latest activity across your accounts.">
        {loading ? <div className="empty-state">Loading...</div> : <TransactionsTable rows={dashboard?.recentTransactions || []} />}
      </SectionCard>

      {(() => {
        const primaryAcc = getPrimaryAccount(user?.username);
        const acc = (dashboard?.accounts || []).find(a => a.accountNumber === primaryAcc);
        return (
          <SectionCard
            title="Primary account"
            subtitle="Default account for UPI payments and fund transfers."
          >
            {acc ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.85rem 1rem', borderRadius: '10px',
                border: '2px solid var(--primary)', background: 'var(--primary-soft)',
              }}>
                <div style={{
                  width: '2.6rem', height: '2.6rem', borderRadius: '50%', flexShrink: 0,
                  background: 'var(--primary)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#fff', fontSize: '1.2rem',
                }}>🏦</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem' }}>{acc.accountNumber}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                    {acc.accountType} · Balance: {formatCurrency(acc.balance)}
                  </div>
                </div>
                <a
                  href="/customer/profile"
                  style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'underline', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  Change
                </a>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '10px', background: '#fef9c3', border: '1px solid #fde047' }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <span style={{ fontSize: '0.875rem', color: '#713f12' }}>
                  No primary account set. <a href="/customer/profile" style={{ color: '#713f12', fontWeight: 600, textDecoration: 'underline' }}>Go to Profile</a> to set one.
                </span>
              </div>
            )}
          </SectionCard>
        );
      })()}
    </AppShell>
  );
}
