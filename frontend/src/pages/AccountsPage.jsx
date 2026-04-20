import { useEffect, useMemo, useState } from 'react';
import { useAutoRefresh } from '../utils/useAutoRefresh';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import Toast from '../components/Toast';
import TransactionsTable from '../components/TransactionsTable';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { addProduct, hasProduct, getCategoryProducts, getProductHistory } from '../utils/products';
import { getPrimaryAccount } from '../utils/primaryAccount';

export default function AccountsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [showOpen, setShowOpen] = useState(false);
  const [openForm, setOpenForm] = useState({ accountType: 'SAVINGS', openingDeposit: '', termMonths: '' });
  const [, refresh] = useState(0);
  const [errorModal, setErrorModal] = useState('');
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [depForm, setDepForm] = useState({ account: '', amount: '', remarks: '' });
  const [wdForm, setWdForm] = useState({ account: '', amount: '', remarks: '' });
  const [txnLoading, setTxnLoading] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [productRequests, setProductRequests] = useState([]);
  const lsAccPending = getCategoryProducts('accounts');
  const lsAccHistory = getProductHistory().filter(h => h.category === 'accounts');

  const load = async () => {
    setLoading(true);
    try {
      const [dashRes, prRes] = await Promise.allSettled([
        api.get('/customers/dashboard'),
        api.get('/product-requests/my'),
      ]);
      if (dashRes.status === 'fulfilled') setDashboard(dashRes.value.data.data);
      if (prRes.status === 'fulfilled') {
        const myReqs = (prRes.value.data?.data || []).filter(r => r.category === 'accounts');
        setProductRequests(myReqs);
      }
    } catch (e) {
      if (e.response?.status !== 403) {
        setToast({ message: e.response?.data?.message || 'Unable to load accounts.', type: 'error' });
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

  const activeSavings = (dashboard?.accounts || []).filter(a => a.accountType !== 'TERM' && a.status === 'ACTIVE');

  const submitDeposit = async () => {
    const acc = activeSavings.find(a => a.accountNumber === depForm.account) || activeSavings[0];
    if (!acc) return setErrorModal('No active savings account found.');
    if (!depForm.amount || Number(depForm.amount) <= 0) return setErrorModal('Please enter a valid deposit amount.');
    setTxnLoading(true);
    try {
      await api.post(`/accounts/${acc.accountNumber}/deposit`, { amount: Number(depForm.amount), remarks: depForm.remarks || 'Self-service deposit' });
      setToast({ message: `₹${depForm.amount} deposited successfully.`, type: 'success' });
      setDepForm({ account: '', amount: '', remarks: '' });
      setShowDeposit(false);
      load();
    } catch (e) {
      setErrorModal(e.response?.data?.message || 'Deposit failed. Please try again.');
    } finally {
      setTxnLoading(false);
    }
  };

  const submitWithdraw = async () => {
    const acc = activeSavings.find(a => a.accountNumber === wdForm.account) || activeSavings[0];
    if (!acc) return setErrorModal('No active savings account found.');
    if (!wdForm.amount || Number(wdForm.amount) <= 0) return setErrorModal('Please enter a valid withdrawal amount.');
    setTxnLoading(true);
    try {
      await api.post(`/accounts/${acc.accountNumber}/withdraw`, { amount: Number(wdForm.amount), remarks: wdForm.remarks || 'Self-service withdrawal' });
      setToast({ message: `₹${wdForm.amount} withdrawn successfully.`, type: 'success' });
      setWdForm({ account: '', amount: '', remarks: '' });
      setShowWithdraw(false);
      load();
    } catch (e) {
      setErrorModal(e.response?.data?.message || 'Withdrawal failed. Check your balance and try again.');
    } finally {
      setTxnLoading(false);
    }
  };

  return (
    <AppShell role="CUSTOMER" title="My Accounts" subtitle="View all your savings and fixed deposit accounts.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {errorModal && (
        <div className="modal-backdrop" onClick={() => setErrorModal('')}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="error-modal-icon">⚠️</div>
            <h3>Error</h3>
            <p className="error-modal-msg">{errorModal}</p>
            <div className="modal-actions">
              <button className="button button--primary" onClick={() => setErrorModal('')}>OK</button>
            </div>
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

      <div className="stats-grid">
        <StatCard label="Portfolio balance" value={formatCurrency(totals.balance)} helper="Across all linked accounts" />
        <StatCard label="Projected interest" value={formatCurrency(totals.interest)} helper="Current estimated earnings" />
        <StatCard label="Beneficiaries" value={String(dashboard?.beneficiaries?.length || 0)} helper="Saved transfer profiles" />
        <StatCard label="Nominees" value={String(dashboard?.nominees?.length || 0)} helper="Linked legal nominees" />
      </div>

{(() => {
        const pending  = productRequests.filter(r => r.status === 'PENDING');
        const decided  = productRequests.filter(r => r.status === 'APPROVED' || r.status === 'DECLINED');
        const allCount = pending.length + decided.length + lsAccPending.length + lsAccHistory.length;
        if (allCount === 0) return null;
        return (
          <SectionCard title="Account opening requests" subtitle={`${allCount} request(s) on record.`}>
            <div className="my-products-strip">
              {pending.map(r => (
                <span key={r.id} className="my-product-chip">📄 {r.productTitle.split(':')[0]} — <em>Pending admin approval</em></span>
              ))}
              {decided.map(r => (
                <span key={r.id} className={`my-product-chip my-product-chip--${r.status === 'APPROVED' ? 'approved' : 'declined'}`}>
                  {r.status === 'APPROVED' ? '✅' : '❌'} {r.productTitle.split(':')[0]} — <em>{r.status === 'APPROVED' ? 'Approved — account opened' : 'Declined'}</em>
                </span>
              ))}
              {lsAccPending.map((p, i) => (
                <span key={`ls-p-${i}`} className="my-product-chip">📄 {p.title} — <em>Pending admin approval</em></span>
              ))}
              {lsAccHistory.map((h, i) => (
                <span key={`ls-h-${i}`} className={`my-product-chip my-product-chip--${h.decision === 'APPROVED' ? 'approved' : 'declined'}`}>
                  {h.decision === 'APPROVED' ? '✅' : '❌'} {h.title} — <em>{h.decision === 'APPROVED' ? 'Approved successfully' : 'Declined'}</em>
                </span>
              ))}
            </div>
          </SectionCard>
        );
      })()}

      <SectionCard title="Linked accounts" subtitle="Bank accounts linked to your profile.">
        {!loading && dashboard?.accounts?.length > 0 && (
          <input
            type="text"
            placeholder="Search by account number…"
            value={accountSearch}
            onChange={e => setAccountSearch(e.target.value)}
            style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box', background: 'var(--panel)', color: 'var(--text)' }}
          />
        )}
        {loading ? <div className="empty-state">Loading accounts...</div> : (
          dashboard?.accounts?.length > 0 ? (
            <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    {['Account Number', 'Type', 'Balance', 'Interest Rate', 'Status', 'Opened'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.accounts
                    .filter(acc => acc.accountNumber.includes(accountSearch.trim()))
                    .map(acc => (
                    <tr key={acc.accountNumber} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => navigate(`/customer/accounts/${acc.accountNumber}`)}>
                      <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>
                        {acc.accountNumber}
                        {acc.accountNumber === getPrimaryAccount(user?.username) && (
                          <span title="Primary account" style={{ color: '#e11d48', marginLeft: '0.35rem', fontSize: '0.9rem' }}>★</span>
                        )}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{{ SAVINGS: 'Savings', TERM: 'Fixed Deposit', STUDENT: 'Student', RURAL: 'Rural', URBAN: 'Urban', WOMEN: 'Women', SENIOR_CITIZEN: 'Senior Citizen', NRI: 'NRI' }[acc.accountType] || acc.accountType}</td>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{formatCurrency(acc.balance)}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{acc.interestRate}% p.a.</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}><span className={`pill pill--${acc.status.toLowerCase()}`}>{acc.status}</span></td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>{formatDate(acc.dateOfOpening)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty-state" style={{ marginBottom: '1rem' }}>No accounts linked yet. Open a new account below.</div>
        )}
        <button className="button button--primary button--sm" onClick={() => setShowOpen(true)}>+ Open New Account</button>
      </SectionCard>

      <SectionCard title="Account portfolio" subtitle="Full details of your savings and fixed deposits.">
        {loading ? <div className="empty-state">Loading account summary...</div> : null}
        <div className="account-grid">
          {(dashboard?.accounts || [])
            .filter(account => account.accountNumber.includes(accountSearch.trim()))
            .map((account) => (
            <article
              key={account.accountNumber}
              className="account-card account-card--clickable"
              onClick={() => navigate(`/customer/accounts/${account.accountNumber}`)}
            >
              <div className="account-card__top">
                <div>
                  <div className="account-card__type">{{
                    SAVINGS: 'Savings account', TERM: 'Term deposit', STUDENT: 'Student savings',
                    RURAL: 'Rural savings', URBAN: 'Urban savings', WOMEN: 'Women savings',
                    SENIOR_CITIZEN: 'Senior citizen savings', NRI: 'NRI savings'
                  }[account.accountType] || account.accountType}</div>
                  <h3 style={{ fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '0.05em' }}>
                    {account.accountNumber}
                    {account.accountNumber === getPrimaryAccount(user?.username) && (
                      <span title="Primary account" style={{ color: '#e11d48', marginLeft: '0.35rem' }}>★</span>
                    )}
                  </h3>
                </div>
                <span className={`pill pill--${account.status.toLowerCase()}`}>{account.status}</span>
              </div>
              <div className="account-card__balance">{formatCurrency(account.balance)}</div>
              <div className="account-card__meta">
                <span>Opened {formatDate(account.dateOfOpening)}</span>
                <span>{account.interestRate}% p.a.</span>
              </div>
              <div className="account-card__details">
                {account.accountType === 'TERM' ? (
                  <>
                    <span>Principal: {formatCurrency(account.principalAmount)}</span>
                    <span>Tenure: {account.termMonths} months</span>
                  </>
                ) : (
                  <>
                    <span>Minimum balance: {formatCurrency(account.minimumBalance)}</span>
                    <span>Penalty fee: {formatCurrency(account.penaltyFee)}</span>
                  </>
                )}
              </div>
              <div className="account-card__interest">
                Estimated interest: <strong>{formatCurrency(account.estimatedInterest)}</strong>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Recent transactions" subtitle="Latest activity across all your accounts.">
        <TransactionsTable rows={dashboard?.recentTransactions || []} />
      </SectionCard>

      {showDeposit && (
        <div className="modal-backdrop" onClick={() => setShowDeposit(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Deposit Funds</h3>
            <div className="stack-form">
              {activeSavings.length > 1 && (
                <label>
                  <span>Account</span>
                  <select value={depForm.account} onChange={e => setDepForm(p => ({ ...p, account: e.target.value }))}>
                    <option value="">Auto-select primary</option>
                    {activeSavings.map(a => <option key={a.accountNumber} value={a.accountNumber}>{a.accountNumber} — {formatCurrency(a.balance)}</option>)}
                  </select>
                </label>
              )}
              <label>
                <span>Amount (₹)</span>
                <input type="text" inputMode="numeric" maxLength={10} placeholder="Enter amount" value={depForm.amount} onChange={e => setDepForm(p => ({ ...p, amount: e.target.value.replace(/\D/g, '') }))} />
              </label>
              <label>
                <span>Remarks (optional)</span>
                <input type="text" placeholder="e.g. Monthly savings" value={depForm.remarks} onChange={e => setDepForm(p => ({ ...p, remarks: e.target.value }))} />
              </label>
              <div className="modal-actions">
                <button className="button button--secondary" onClick={() => setShowDeposit(false)}>Cancel</button>
                <button className="button button--primary" disabled={txnLoading} onClick={submitDeposit}>{txnLoading ? 'Processing…' : 'Deposit'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWithdraw && (
        <div className="modal-backdrop" onClick={() => setShowWithdraw(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Withdraw Funds</h3>
            <div className="stack-form">
              {activeSavings.length > 1 && (
                <label>
                  <span>Account</span>
                  <select value={wdForm.account} onChange={e => setWdForm(p => ({ ...p, account: e.target.value }))}>
                    <option value="">Auto-select primary</option>
                    {activeSavings.map(a => <option key={a.accountNumber} value={a.accountNumber}>{a.accountNumber} — {formatCurrency(a.balance)}</option>)}
                  </select>
                </label>
              )}
              <label>
                <span>Amount (₹)</span>
                <input type="text" inputMode="numeric" maxLength={10} placeholder="Enter amount" value={wdForm.amount} onChange={e => setWdForm(p => ({ ...p, amount: e.target.value.replace(/\D/g, '') }))} />
              </label>
              <label>
                <span>Remarks (optional)</span>
                <input type="text" placeholder="e.g. ATM withdrawal" value={wdForm.remarks} onChange={e => setWdForm(p => ({ ...p, remarks: e.target.value }))} />
              </label>
              <div className="modal-actions">
                <button className="button button--secondary" onClick={() => setShowWithdraw(false)}>Cancel</button>
                <button className="button button--primary" disabled={txnLoading} onClick={submitWithdraw}>{txnLoading ? 'Processing…' : 'Withdraw'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOpen && (
        <div className="modal-backdrop" onClick={() => setShowOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Open New Account</h3>
            <div className="stack-form">
              <label>
                <span>Account type</span>
                <select value={openForm.accountType} onChange={e => setOpenForm(p => ({ ...p, accountType: e.target.value }))}>
                  <option value="SAVINGS">Regular Savings</option>
                  <option value="STUDENT">Student Savings (Zero min balance)</option>
                  <option value="RURAL">Rural Savings (₹500 min balance)</option>
                  <option value="URBAN">Urban Savings</option>
                  <option value="WOMEN">Women Savings (4% interest)</option>
                  <option value="SENIOR_CITIZEN">Senior Citizen Savings (4.5% interest)</option>
                  <option value="NRI">NRI Savings</option>
                  <option value="TERM">Fixed Deposit (Term)</option>
                </select>
              </label>
              <label>
                <span>Opening deposit (₹)</span>
                <input type="text" inputMode="numeric" maxLength={10} placeholder={openForm.accountType === 'TERM' ? 'Min ₹5,000' : openForm.accountType === 'STUDENT' ? '₹0 (no minimum)' : openForm.accountType === 'RURAL' ? 'Min ₹500' : 'Min ₹1,000'} value={openForm.openingDeposit} onChange={e => setOpenForm(p => ({ ...p, openingDeposit: e.target.value.replace(/\D/g, '') }))} />
              </label>
              {openForm.accountType === 'TERM' && (
                <label>
                  <span>Term (months)</span>
                  <input type="text" inputMode="numeric" maxLength={3} placeholder="e.g. 12" value={openForm.termMonths} onChange={e => setOpenForm(p => ({ ...p, termMonths: e.target.value.replace(/\D/g, '') }))} />
                </label>
              )}
              <div className="modal-actions">
                <button className="button button--secondary" onClick={() => setShowOpen(false)}>Cancel</button>
                <button className="button button--primary" onClick={async () => {
                  const amt = Number(openForm.openingDeposit);
                  if (openForm.accountType === 'STUDENT') {
                    if (openForm.openingDeposit === '' || amt < 0) return setErrorModal('Opening deposit cannot be negative.');
                  } else if (openForm.accountType === 'RURAL') {
                    if (!openForm.openingDeposit || amt < 500) return setErrorModal('Rural account requires at least ₹500 opening deposit.');
                  } else if (openForm.accountType === 'TERM') {
                    if (!openForm.openingDeposit || amt < 5000) return setErrorModal('Fixed deposit requires at least ₹5,000 opening deposit.');
                    if (!openForm.termMonths || Number(openForm.termMonths) < 1) return setErrorModal('Please enter a valid term duration in months.');
                  } else {
                    if (!openForm.openingDeposit || amt < 1000) return setErrorModal('This account requires at least ₹1,000 opening deposit.');
                  }
                  try {
                    const productTitle = openForm.accountType === 'TERM'
                      ? `TERM:${amt}:${openForm.termMonths}`
                      : `${openForm.accountType}:${amt}`;
                    await api.post('/product-requests', { category: 'accounts', productTitle });
                    setToast({ message: 'Account opening request submitted! It will be reviewed by the bank and opened upon approval.', type: 'success' });
                    setShowOpen(false);
                    setOpenForm({ accountType: 'SAVINGS', openingDeposit: '', termMonths: '' });
                    load();
                  } catch (e) {
                    setErrorModal(e.response?.data?.message || 'Unable to submit account opening request. Please try again.');
                  }
                }}>Submit Request</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
