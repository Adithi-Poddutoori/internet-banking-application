import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import api from '../services/api';
import { formatCurrency, maskAccount } from '../utils/formatters';

export default function DepositPage() {
  const [accounts, setAccounts] = useState([]);
  const [depForm, setDepForm] = useState({ account: '', amount: '', remarks: '' });
  const [wdForm, setWdForm] = useState({ account: '', amount: '', remarks: '' });
  const [toast, setToast] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  const loadAccounts = async () => {
    try {
      const { data } = await api.get('/accounts');
      setAccounts(data.data || []);
    } catch (e) {
      setToast({ message: 'Unable to load accounts', type: 'error' });
    }
  };

  useEffect(() => { loadAccounts(); }, []);

  const activeSavings = useMemo(() => accounts.filter(a => a.accountType === 'SAVINGS' && a.status === 'ACTIVE'), [accounts]);

  const submitDeposit = async () => {
    const account = activeSavings.find(a => a.accountNumber === depForm.account) || activeSavings[0];
    if (!account) return setErrorModal('No active savings account available. Please open a savings account first.');
    if (!depForm.amount || Number(depForm.amount) <= 0) return setErrorModal('Please enter a valid deposit amount.');
    setLoading(true);
    try {
      await api.post(`/accounts/${account.accountNumber}/deposit`, {
        amount: Number(depForm.amount),
        remarks: depForm.remarks || 'Self-service deposit'
      });
      setToast({ message: `₹${depForm.amount} deposited successfully to ${maskAccount(account.accountNumber)}`, type: 'success' });
      setDepForm({ account: '', amount: '', remarks: '' });
      loadAccounts();
    } catch (e) {
      setErrorModal(e.response?.data?.message || 'Deposit failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitWithdrawal = async () => {
    const account = activeSavings.find(a => a.accountNumber === wdForm.account) || activeSavings[0];
    if (!account) return setErrorModal('No active savings account available. Please open a savings account first.');
    if (!wdForm.amount || Number(wdForm.amount) <= 0) return setErrorModal('Please enter a valid withdrawal amount.');
    setLoading(true);
    try {
      await api.post(`/accounts/${account.accountNumber}/withdraw`, {
        amount: Number(wdForm.amount),
        remarks: wdForm.remarks || 'Self-service withdrawal'
      });
      setToast({ message: `₹${wdForm.amount} withdrawn successfully from ${maskAccount(account.accountNumber)}`, type: 'success' });
      setWdForm({ account: '', amount: '', remarks: '' });
      loadAccounts();
    } catch (e) {
      setErrorModal(e.response?.data?.message || 'Withdrawal failed. Please check your balance and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell role="CUSTOMER" title="Deposit & Withdraw" subtitle="Add or withdraw money from your savings account.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {errorModal && (
        <div className="modal-backdrop" onClick={() => setErrorModal('')}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="error-modal-icon">⚠️</div>
            <h3>Action Failed</h3>
            <p className="error-modal-msg">{errorModal}</p>
            <div className="modal-actions">
              <button className="button button--primary" onClick={() => setErrorModal('')}>OK</button>
            </div>
          </div>
        </div>
      )}

      {activeSavings.length > 0 && (
        <div className="stats-grid">
          {activeSavings.map(a => (
            <div className="stat-card" key={a.accountNumber}>
              <div className="stat-card__label">Savings {maskAccount(a.accountNumber)}</div>
              <div className="stat-card__value">{formatCurrency(a.balance)}</div>
              <div className="stat-card__helper">Available balance</div>
            </div>
          ))}
        </div>
      )}

      <div className="content-grid content-grid--wide">
        <SectionCard title="Deposit funds" subtitle="Add money to your savings account.">
          <div className="stack-form">
            {activeSavings.length > 1 && (
              <label>
                <span>Select account</span>
                <select value={depForm.account} onChange={e => setDepForm(p => ({ ...p, account: e.target.value }))}>
                  <option value="">Choose account</option>
                  {activeSavings.map(a => (
                    <option key={a.accountNumber} value={a.accountNumber}>{maskAccount(a.accountNumber)} — {formatCurrency(a.balance)}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span>Amount (₹)</span>
              <input type="text" inputMode="numeric" maxLength={10} placeholder="Enter amount" value={depForm.amount} onChange={e => setDepForm(p => ({ ...p, amount: e.target.value.replace(/\D/g, '') }))} />
            </label>
            <button className="button button--primary" onClick={submitDeposit} disabled={loading}>
              {loading ? 'Processing...' : 'Deposit funds'}
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Withdraw funds" subtitle="Withdraw money from your savings account.">
          <div className="stack-form">
            {activeSavings.length > 1 && (
              <label>
                <span>Select account</span>
                <select value={wdForm.account} onChange={e => setWdForm(p => ({ ...p, account: e.target.value }))}>
                  <option value="">Choose account</option>
                  {activeSavings.map(a => (
                    <option key={a.accountNumber} value={a.accountNumber}>{maskAccount(a.accountNumber)} — {formatCurrency(a.balance)}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span>Amount (₹)</span>
              <input type="text" inputMode="numeric" maxLength={10} placeholder="Enter amount" value={wdForm.amount} onChange={e => setWdForm(p => ({ ...p, amount: e.target.value.replace(/\D/g, '') }))} />
            </label>
            <label>
              <span>Remarks</span>
              <input placeholder="Optional remarks" value={wdForm.remarks} onChange={e => setWdForm(p => ({ ...p, remarks: e.target.value }))} />
            </label>
            <button className="button button--secondary" onClick={submitWithdrawal} disabled={loading}>
              {loading ? 'Processing...' : 'Withdraw funds'}
            </button>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
