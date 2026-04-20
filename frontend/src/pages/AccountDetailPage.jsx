import { useEffect, useState } from 'react';
import { useAutoRefresh } from '../utils/useAutoRefresh';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import TransactionsTable from '../components/TransactionsTable';
import Toast from '../components/Toast';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function AccountDetailPage() {
  const { accountNumber } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [showDepWd, setShowDepWd] = useState(false);
  const [depWdTab, setDepWdTab] = useState('deposit'); // 'deposit' | 'withdraw'
  const [depAmount, setDepAmount] = useState('');
  const [depRemarks, setDepRemarks] = useState('');
  const [wdAmount, setWdAmount] = useState('');
  const [wdRemarks, setWdRemarks] = useState('');
  const [txnLoading, setTxnLoading] = useState(false);

  const load = async () => {
    try {
      const dashRes = await api.get('/customers/dashboard');
      const dash = dashRes.data.data;
      const found = dash.accounts?.find(a => a.accountNumber === accountNumber);
      if (!found) {
        setToast({ message: 'Account not found.', type: 'error' });
        setLoading(false);
        return;
      }
      setAccount(found);
      const txns = (dash.recentTransactions || []).filter(
        t => t.accountNumber === accountNumber || t.fromAccount === accountNumber || t.toAccount === accountNumber
      );
      setTransactions(txns);
    } catch (e) {
      if (e.response?.status !== 403) setToast({ message: e.response?.data?.message || 'Unable to load account details.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [accountNumber]);
  useAutoRefresh(load, 30000);

  const submitDeposit = async () => {
    if (!depAmount || Number(depAmount) <= 0) return setToast({ message: 'Enter a valid amount.', type: 'error' });
    setTxnLoading(true);
    try {
      await api.post(`/accounts/${accountNumber}/deposit`, { amount: Number(depAmount), remarks: depRemarks || 'Self-service deposit' });
      setToast({ message: `₹${depAmount} deposited successfully.`, type: 'success' });
      setDepAmount(''); setDepRemarks(''); setShowDepWd(false);
      load();
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Deposit failed.', type: 'error' });
    } finally { setTxnLoading(false); }
  };

  const submitWithdraw = async () => {
    if (!wdAmount || Number(wdAmount) <= 0) return setToast({ message: 'Enter a valid amount.', type: 'error' });
    setTxnLoading(true);
    try {
      await api.post(`/accounts/${accountNumber}/withdraw`, { amount: Number(wdAmount), remarks: wdRemarks || 'Self-service withdrawal' });
      setToast({ message: `₹${wdAmount} withdrawn successfully.`, type: 'success' });
      setWdAmount(''); setWdRemarks(''); setShowDepWd(false);
      load();
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Withdrawal failed. Check your balance.', type: 'error' });
    } finally { setTxnLoading(false); }
  };

  return (
    <AppShell role="CUSTOMER" title="Account Details" subtitle={`Detailed view for account ${accountNumber}`}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {loading && <div className="empty-state">Loading account details...</div>}

      {account && (
        <>
          <div className="account-detail-header">
            <div className="account-detail-header__type">
              {account.accountType === 'TERM' ? 'Term Deposit' : 'Savings Account'}
            </div>
            <div className="account-detail-header__number">{accountNumber}</div>
            <span className={`pill pill--${account.status.toLowerCase()}`}>{account.status}</span>
          </div>

          <div className="account-detail-balance">
            <div className="account-detail-balance__label">Available Balance</div>
            <div className="account-detail-balance__value">{formatCurrency(account.balance)}</div>
          </div>

          <SectionCard title="Account information" subtitle="Key details about this account.">
            <div className="profile-grid">
              <div className="profile-field">
                <div className="profile-field__label">Account Number</div>
                <div className="profile-field__value">{accountNumber}</div>
              </div>
              <div className="profile-field">
                <div className="profile-field__label">Account Type</div>
                <div className="profile-field__value">{account.accountType === 'TERM' ? 'Term Deposit' : 'Savings'}</div>
              </div>
              <div className="profile-field">
                <div className="profile-field__label">Status</div>
                <div className="profile-field__value">{account.status}</div>
              </div>
              <div className="profile-field">
                <div className="profile-field__label">Date of Opening</div>
                <div className="profile-field__value">{formatDate(account.dateOfOpening)}</div>
              </div>
              <div className="profile-field">
                <div className="profile-field__label">Interest Rate</div>
                <div className="profile-field__value">{account.interestRate}% p.a.</div>
              </div>
              <div className="profile-field">
                <div className="profile-field__label">Estimated Interest</div>
                <div className="profile-field__value">{formatCurrency(account.estimatedInterest)}</div>
              </div>
              {account.accountType === 'SAVINGS' ? (
                <>
                  <div className="profile-field">
                    <div className="profile-field__label">Minimum Balance</div>
                    <div className="profile-field__value">{formatCurrency(account.minimumBalance)}</div>
                  </div>
                  <div className="profile-field">
                    <div className="profile-field__label">Penalty Fee</div>
                    <div className="profile-field__value">{formatCurrency(account.penaltyFee)}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="profile-field">
                    <div className="profile-field__label">Principal Amount</div>
                    <div className="profile-field__value">{formatCurrency(account.principalAmount)}</div>
                  </div>
                  <div className="profile-field">
                    <div className="profile-field__label">Tenure</div>
                    <div className="profile-field__value">{account.termMonths} months</div>
                  </div>
                </>
              )}
            </div>
          </SectionCard>

          <div className="account-detail-actions">
            <button className="button button--primary" onClick={() => { setShowDepWd(true); setDepWdTab('deposit'); }}>Deposit / Withdraw</button>
            <button className="button button--secondary" onClick={() => navigate(`/customer/transfer?from=/customer/accounts/${accountNumber}`)}>Transfer Funds</button>
            <button className="button button--ghost" onClick={() => navigate(`/customer/transactions?account=${accountNumber}&from=/customer/accounts/${accountNumber}`)}>View All Transactions</button>
          </div>

          {showDepWd && (
            <div className="modal-backdrop" onClick={() => setShowDepWd(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <button
                    className={`button button--sm ${depWdTab === 'deposit' ? 'button--primary' : 'button--ghost'}`}
                    onClick={() => setDepWdTab('deposit')}
                  >Deposit</button>
                  <button
                    className={`button button--sm ${depWdTab === 'withdraw' ? 'button--primary' : 'button--ghost'}`}
                    onClick={() => setDepWdTab('withdraw')}
                  >Withdraw</button>
                </div>

                {depWdTab === 'deposit' ? (
                  <div className="stack-form">
                    <h3 style={{ marginBottom: '0.75rem' }}>Deposit Funds</h3>
                    <label>
                      <span>Amount (₹)</span>
                      <input type="text" inputMode="numeric" maxLength={10} placeholder="Enter amount" value={depAmount} onChange={e => setDepAmount(e.target.value.replace(/\D/g, ''))} />
                    </label>
                    <label>
                      <span>Remarks (optional)</span>
                      <input type="text" placeholder="e.g. Monthly savings" value={depRemarks} onChange={e => setDepRemarks(e.target.value)} />
                    </label>
                    <div className="modal-actions">
                      <button className="button button--secondary" onClick={() => setShowDepWd(false)}>Cancel</button>
                      <button className="button button--primary" disabled={txnLoading} onClick={submitDeposit}>{txnLoading ? 'Processing…' : 'Deposit'}</button>
                    </div>
                  </div>
                ) : (
                  <div className="stack-form">
                    <h3 style={{ marginBottom: '0.75rem' }}>Withdraw Funds</h3>
                    <label>
                      <span>Amount (₹)</span>
                      <input type="text" inputMode="numeric" maxLength={10} placeholder="Enter amount" value={wdAmount} onChange={e => setWdAmount(e.target.value.replace(/\D/g, ''))} />
                    </label>
                    <label>
                      <span>Remarks (optional)</span>
                      <input type="text" placeholder="e.g. ATM withdrawal" value={wdRemarks} onChange={e => setWdRemarks(e.target.value)} />
                    </label>
                    <div className="modal-actions">
                      <button className="button button--secondary" onClick={() => setShowDepWd(false)}>Cancel</button>
                      <button className="button button--primary" disabled={txnLoading} onClick={submitWithdraw}>{txnLoading ? 'Processing…' : 'Withdraw'}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <SectionCard title="Recent transactions" subtitle="Activity for this account.">
            {transactions.length > 0 ? (
              <TransactionsTable rows={transactions} />
            ) : (
              <div className="empty-state">No transactions found for this account.</div>
            )}
          </SectionCard>
        </>
      )}
    </AppShell>
  );
}
