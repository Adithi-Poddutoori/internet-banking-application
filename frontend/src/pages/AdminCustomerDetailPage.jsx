import { useEffect, useState } from 'react';
import { useAutoRefresh } from '../utils/useAutoRefresh';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import api from '../services/api';
import { formatCurrency, formatDate, formatDateIN, formatINR } from '../utils/formatters';

/** Shared table header cell — upper-case muted label */
const TH = s => <th key={s} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>{s}</th>;

export default function AdminCustomerDetailPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(null);
  const [editAccountModal, setEditAccountModal] = useState(null); // { accountNumber, status, interestRate }
  const [editAccLoading, setEditAccLoading] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [deletedLogs, setDeletedLogs] = useState([]);
  const [tab360, setTab360] = useState('profile');
  const [, forceRefresh360] = useState(0);
  const [customerProducts, setCustomerProducts] = useState([]);
  const [customerBills, setCustomerBills] = useState([]);
  const [customerClaims, setCustomerClaims] = useState([]);
  const [customerRewards, setCustomerRewards] = useState([]);
  const [customerTxns, setCustomerTxns] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/customers/${customerId}`);
      setCustomer(data.data);
      setEditForm(prev => editing ? prev : {
        customerName: data.data.customerName || '',
        emailId: data.data.emailId || '',
        phoneNo: data.data.phoneNo || ''
      });
      const logs = await api.get(`/admin/customers/${customerId}/deleted-accounts`);
      setDeletedLogs(logs.data.data || []);
      const userId = data.data.userId;
      const acctNumbers = (data.data.accounts || []).map(a => a.accountNumber);
      await Promise.allSettled([
        api.get('/product-requests/admin').then(r => {
          const all = r.data?.data || [];
          setCustomerProducts(all.filter(x => String(x.customerId) === String(customerId) || x.customerUsername === userId));
        }).catch(() => {}),
        api.get('/bill-mandates/admin').then(r => {
          setCustomerBills((r.data?.data || []).filter(b => b.customerUsername === userId));
        }).catch(() => {}),
        api.get('/insurance-claims/admin').then(r => {
          setCustomerClaims((r.data?.data || []).filter(c => c.customerUsername === userId));
        }).catch(() => {}),
        api.get('/reward-redemptions/admin').then(r => {
          setCustomerRewards((r.data?.data || []).filter(rw => rw.customerUsername === userId));
        }).catch(() => {}),
        api.get('/admin/reports/transactions').then(r => {
          const allTx = r.data?.data?.transactions || [];
          setCustomerTxns(allTx.filter(tx => acctNumbers.includes(tx.accountNumber)));
        }).catch(() => {}),
      ]);
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Unable to load customer details.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [customerId]);
  useAutoRefresh(load, 5000);

  const deleteCustomer = async () => {
    setDeleteConfirm(false);
    try {
      await api.post(`/admin/customers/${customerId}/notify`);
      setToast({ message: 'Termination notice sent. Returning to customers list...', type: 'success' });
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Failed to send termination notice.', type: 'error' });
      return;
    }
    setTimeout(() => navigate('/admin/customers'), 1500);
  };

  const deleteAccount = async () => {
    const { accountNumber, balance } = deleteAccountConfirm;
    const hasBalance = Number(balance) > 0;
    if (hasBalance) {
      if (!transferTo.trim()) {
        setToast({ message: 'Please enter a target account number to transfer the remaining balance.', type: 'error' });
        return;
      }
      try {
        await api.post(`/admin/accounts/${accountNumber}/transfer-and-delete`, { targetAccountNumber: transferTo.trim() });
        setToast({ message: `Balance transferred and account ${accountNumber} deleted successfully.`, type: 'success' });
      } catch (e) {
        setToast({ message: e.response?.data?.message || 'Unable to transfer balance and delete account.', type: 'error' });
        setDeleteAccountConfirm(null);
        setTransferTo('');
        return;
      }
    } else {
      try {
        await api.delete(`/admin/accounts/${accountNumber}`);
        setToast({ message: `Account ${accountNumber} deleted successfully.`, type: 'success' });
      } catch (e) {
        setToast({ message: e.response?.data?.message || 'Unable to delete account.', type: 'error' });
        setDeleteAccountConfirm(null);
        setTransferTo('');
        return;
      }
    }
    setDeleteAccountConfirm(null);
    setTransferTo('');
    load();
  };

  const blockCustomer = async () => {
    setBlockConfirm(false);
    try {
      await api.post(`/admin/customers/${customerId}/block`);
      setToast({ message: 'Customer blocked successfully. They can no longer log in.', type: 'success' });
      load();
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Failed to block customer. Please try again.', type: 'error' });
    }
  };

  const cancelTerminationNotice = async () => {
    try {
      await api.delete(`/admin/customers/${customerId}/notify`);
      setToast({ message: 'Termination notice cancelled. The customer account is safe.', type: 'success' });
      load();
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Failed to cancel termination notice.', type: 'error' });
    }
  };

  const approveCustomer = async () => {
    try {
      await api.post(`/admin/customers/${customerId}/approve`, { remarks: 'Approved by admin' });
      setToast({ message: 'Customer approved — access granted successfully.', type: 'success' });
      load();
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Unable to approve customer.', type: 'error' });
    }
  };

  const declineCustomer = async () => {
    try {
      await api.post(`/admin/customers/${customerId}/decline`, { remarks: 'Declined by admin' });
      setToast({ message: 'Customer application declined.', type: 'success' });
      load();
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Unable to decline customer.', type: 'error' });
    }
  };

  const unblockCustomer = async () => {
    try {
      await api.post(`/admin/customers/${customerId}/unblock`);
      setToast({ message: 'Customer unblocked. They can now log in and use their account.', type: 'success' });
      load();
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Failed to unblock customer.', type: 'error' });
    }
  };

  const saveEditAccount = async () => {
    const rate = Number(editAccountModal.interestRate);
    if (isNaN(rate) || rate < 0 || rate > 20)
      return setToast({ message: 'Interest rate must be between 0 and 20%.', type: 'error' });
    setEditAccLoading(true);
    try {
      await api.put(`/admin/accounts/${editAccountModal.accountNumber}`, {
        status: editAccountModal.status,
        interestRate: Number(editAccountModal.interestRate)
      });
      setToast({ message: `Account ${editAccountModal.accountNumber} updated successfully.`, type: 'success' });
      setEditAccountModal(null);
      load();
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Failed to update account.', type: 'error' });
    } finally {
      setEditAccLoading(false);
    }
  };

  return (
    <AppShell role="ADMIN" title="Customer Details" subtitle={customer ? customer.customerName : 'Loading...'}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {loading && <div className="empty-state">Loading customer details...</div>}

      {customer && (
        <>
          <div className="customer-detail-header">
            <div className="customer-detail-header__avatar">
              {(customer.customerName || 'C').slice(0, 1)}
            </div>
            <div className="customer-detail-header__info">
              <h2>{customer.customerName}</h2>
              <p>{customer.emailId} • {customer.phoneNo}</p>
              <span className={`pill pill--${customer.status.toLowerCase()}`}>{customer.status}</span>
            </div>
            <div className="customer-detail-header__actions">
              {customer.status === 'PENDING' && (
                <>
                  <button className="button button--primary" onClick={approveCustomer}>
                    ✅ Grant Access
                  </button>
                  <button className="button button--ghost-danger" onClick={declineCustomer}>
                    ✕ Decline
                  </button>
                </>
              )}
              <button className="button button--secondary" onClick={() => setEditing(!editing)}>
                {editing ? 'Cancel edit' : 'Edit customer'}
              </button>
              {customer.status === 'BLOCKED' ? (
                <button className="button button--primary" onClick={unblockCustomer}>
                  ✅ Unblock customer
                </button>
              ) : (
                <button className="button button--ghost-danger" onClick={() => setBlockConfirm(true)} style={{ borderColor: '#7c3aed', color: '#7c3aed' }}>
                  🚫 Block customer
                </button>
              )}
              <button className="button button--danger" onClick={() => setDeleteConfirm(true)}>
                Delete customer
              </button>
              {customer.terminationNoticeDate && (
                <button className="button button--secondary" onClick={cancelTerminationNotice} style={{ borderColor: '#d97706', color: '#d97706' }}>
                  ↩ Cancel notice
                </button>
              )}
            </div>
          </div>

          {editing && (
            <SectionCard title="Edit customer" subtitle="Update basic customer information.">
              <div className="edit-form-grid">
                <label>
                  <span>Full name</span>
                  <input
                    value={editForm.customerName}
                    maxLength={100}
                    onChange={e => setEditForm(p => ({ ...p, customerName: e.target.value }))}
                    placeholder="e.g. Alice Sharma"
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={editForm.emailId}
                    maxLength={120}
                    onChange={e => setEditForm(p => ({ ...p, emailId: e.target.value }))}
                    placeholder="e.g. alice@example.com"
                  />
                </label>
                <label>
                  <span>Phone</span>
                  <input
                    type="tel"
                    value={editForm.phoneNo}
                    maxLength={10}
                    onChange={e => setEditForm(p => ({ ...p, phoneNo: e.target.value.replace(/\D/g, '') }))}
                    placeholder="10-digit mobile number"
                  />
                </label>
                <div style={{ display: 'flex', alignItems: 'end' }}>
                  <button className="button button--primary" onClick={async () => {
                    if (!editForm.customerName.trim() || editForm.customerName.trim().length < 2)
                      return setToast({ message: 'Full name must be at least 2 characters.', type: 'error' });
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.emailId))
                      return setToast({ message: 'Please enter a valid email address.', type: 'error' });
                    if (!/^\d{10,15}$/.test(editForm.phoneNo))
                      return setToast({ message: 'Phone number must be 10–15 digits.', type: 'error' });
                    try {
                      await api.put(`/admin/customers/${customerId}`, editForm);
                      setToast({ message: 'Customer information updated successfully.', type: 'success' });
                      setEditing(false);
                      load();
                    } catch (e) {
                      setToast({ message: e.response?.data?.message || 'Failed to update customer.', type: 'error' });
                    }
                  }}>Save changes</button>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── CUSTOMER 360 TAB BAR ── */}
          <div className="tab-bar" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            {[
              ['profile',   'Profile'],
              ['products',  'Products'],
              ['bills',     'Bills'],
              ['claims',    'Claims'],
              ['rewards',   'Rewards'],
              ['activity',  'Activity'],
            ].map(([t, lbl]) => (
              <button key={t} className={`tab-bar__tab${tab360 === t ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab360(t)}>{lbl}</button>
            ))}
          </div>

          {/* ── PROFILE TAB ── */}
          {tab360 === 'profile' && (<>
          <SectionCard title="Customer information" subtitle="Registered profile details.">
            <div className="profile-grid">
              <div className="profile-field"><div className="profile-field__label">Customer ID</div><div className="profile-field__value">{customer.id}</div></div>
              <div className="profile-field">
                <div className="profile-field__label">Account Number</div>
                <div className="profile-field__value" style={{ fontFamily: 'monospace' }}>
                  {customer.accounts?.length > 0
                    ? customer.accounts.map(a => a.accountNumber).join(', ')
                    : '—'}
                </div>
              </div>
              <div className="profile-field"><div className="profile-field__label">Full Name</div><div className="profile-field__value">{customer.customerName}</div></div>
              <div className="profile-field"><div className="profile-field__label">User ID</div><div className="profile-field__value">{customer.userId}</div></div>
              <div className="profile-field"><div className="profile-field__label">Email</div><div className="profile-field__value">{customer.emailId}</div></div>
              <div className="profile-field"><div className="profile-field__label">Phone</div><div className="profile-field__value">{customer.phoneNo}</div></div>
              <div className="profile-field"><div className="profile-field__label">Age</div><div className="profile-field__value">{customer.age || 'N/A'}</div></div>
              <div className="profile-field"><div className="profile-field__label">Gender</div><div className="profile-field__value">{customer.gender || 'N/A'}</div></div>
              <div className="profile-field"><div className="profile-field__label">Status</div><div className="profile-field__value">
                <span className={`pill pill--${customer.status.toLowerCase()}`}>{customer.status}</span>
                {customer.terminationNoticeDate && <span className="pill" style={{ background: '#fef3c7', color: '#92400e', marginLeft: '0.4rem' }}>⚠️ Notice sent {new Date(customer.terminationNoticeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
              </div></div>
              {customer.accounts?.length > 0 && (
                <div className="profile-field" style={{ gridColumn: '1 / -1' }}>
                  <div className="profile-field__label">Account Numbers</div>
                  <div className="profile-field__value" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    {customer.accounts.map(acc => (
                      <span key={acc.accountNumber} className={`pill pill--${acc.status.toLowerCase()}`} style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        {acc.accountNumber} ({acc.accountType})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Linked accounts" subtitle={`${customer.accounts?.length || 0} account(s) linked to this customer.`}>
            {customer.accounts?.length ? (
              <>
                <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        {['Account Number', 'Type', 'Balance', 'Rate', 'Status', 'Opened', 'Action'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {customer.accounts.map(acc => (
                        <tr key={acc.accountNumber} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontWeight: 700 }}>{acc.accountNumber}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{{ SAVINGS: 'Savings', TERM: 'Fixed Deposit', STUDENT: 'Student', RURAL: 'Rural', URBAN: 'Urban', WOMEN: 'Women', SENIOR_CITIZEN: 'Senior Citizen', NRI: 'NRI' }[acc.accountType] || acc.accountType}</td>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{formatCurrency(acc.balance)}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{acc.interestRate}% p.a.</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}><span className={`pill pill--${acc.status.toLowerCase()}`}>{acc.status}</span></td>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>{formatDate(acc.dateOfOpening)}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button className="button button--secondary button--sm" onClick={() => setEditAccountModal({ accountNumber: acc.accountNumber, status: acc.status, interestRate: acc.interestRate })}>Edit</button>
                              <button className="button button--danger button--sm" onClick={() => { setTransferTo(''); setDeleteAccountConfirm({ accountNumber: acc.accountNumber, balance: acc.balance }); }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : <div className="empty-state">No accounts linked to this customer.</div>}
          </SectionCard>

          <SectionCard title="Deletion history" subtitle="Previously deleted accounts for this customer.">
            {deletedLogs.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['Account Number', 'Type', 'Balance at Deletion', 'Transferred To', 'Deleted On'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deletedLogs.map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--muted)', textDecoration: 'line-through' }}>{log.accountNumber}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{{ SAVINGS: 'Savings', TERM: 'Fixed Deposit', STUDENT: 'Student', RURAL: 'Rural', URBAN: 'Urban', WOMEN: 'Women', SENIOR_CITIZEN: 'Senior Citizen', NRI: 'NRI' }[log.accountType] || log.accountType}</td>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{formatCurrency(log.balanceAtDeletion)}</td>
                        <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace' }}>
                          {log.transferredToAccountNumber
                            ? <span style={{ color: 'var(--success, #059669)' }}>→ {log.transferredToAccountNumber}</span>
                            : <span style={{ color: 'var(--muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>{formatDate(log.deletedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-state">No accounts have been deleted for this customer.</div>}
          </SectionCard>
          </>)}

          {/* ── PRODUCTS TAB ── */}
          {tab360 === 'products' && (() => {
            const CAT_ICONS = { cards: '', loans: '', insurance: '', investments: '', deposits: '', accounts: '', passbook_chequebook: '', rewards: '' };
            return (
              <SectionCard title="Products & Applications" subtitle={`${customerProducts.length} product application(s) for this customer.`}>
                {customerProducts.length === 0 ? <div className="empty-state">No product applications found for this customer.</div> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>{['Product', 'Category', 'Status', 'Applied On', 'Decided On'].map(TH)}</tr></thead>
                      <tbody>
                        {customerProducts.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{CAT_ICONS[r.category] || ''} {r.productTitle}</td>
                            <td style={{ padding: '0.6rem 0.75rem', textTransform: 'capitalize' }}>{r.category}</td>
                            <td style={{ padding: '0.6rem 0.75rem' }}>
                              <span style={{ fontWeight: 700, color: r.status === 'APPROVED' ? '#16a34a' : r.status === 'DECLINED' ? '#e11d48' : '#d97706' }}>
                                {r.status === 'APPROVED' ? '✅' : r.status === 'DECLINED' ? '❌' : '⏳'} {r.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>{r.appliedOn ? new Date(r.appliedOn).toLocaleDateString('en-IN') : '—'}</td>
                            <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>{r.decidedOn ? new Date(r.decidedOn).toLocaleDateString('en-IN') : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            );
          })()}

          {/* ── BILLS TAB ── */}
          {tab360 === 'bills' && (() => {
            const BILL_ICON = { electricity: '', water: '', gas: '', mobile: '', broadband: '', dth: '', creditcard: '', netflix: '', spotify: '', amazon: '', other: '' };
            return (
              <SectionCard title="Bills & AutoPay" subtitle={`${customerBills.length} bill(s) registered for this customer.`}>
                {customerBills.length === 0 ? <div className="empty-state">No bills found for this customer.</div> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>{['Bill / Nickname', 'Type', 'Amount', 'Frequency', 'AutoPay', 'From Account', 'Last Paid'].map(TH)}</tr></thead>
                      <tbody>
                        {customerBills.map((b, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{b.nickname || b.identifier || '—'}</td>
                            <td style={{ padding: '0.6rem 0.75rem' }}>{BILL_ICON[b.type] || ''} {b.type}</td>
                            <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>₹{Number(b.amount).toLocaleString('en-IN')}</td>
                            <td style={{ padding: '0.6rem 0.75rem', textTransform: 'capitalize' }}>{b.frequency}</td>
                            <td style={{ padding: '0.6rem 0.75rem' }}><span style={{ fontWeight: 700, color: b.autopay ? '#16a34a' : 'var(--muted)' }}>{b.autopay ? '✅ ON' : '— OFF'}</span></td>
                            <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{b.fromAccount}</td>
                            <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>{b.lastPaid ? new Date(b.lastPaid).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            );
          })()}

          {/* ── CLAIMS TAB ── */}
          {tab360 === 'claims' && (() => {
            const STATUS_MAP = { PENDING: { color: '#d97706', label: '⏳ Pending' }, APPROVED: { color: '#16a34a', label: '✅ Approved' }, SETTLED: { color: '#16a34a', label: '✔ Settled' }, DECLINED: { color: '#e11d48', label: '❌ Declined' } };
            const updateClaimStatus = async (claimId, claimRef, newStatus) => {
              try {
                await api.put(`/insurance-claims/admin/${claimId}`, { status: newStatus });
                setToast({ message: `Claim ${claimRef} marked as ${newStatus}.`, type: newStatus === 'APPROVED' || newStatus === 'SETTLED' ? 'success' : 'info' });
                setCustomerClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: newStatus } : c));
              } catch (e) {
                setToast({ message: e.response?.data?.message || 'Failed to update claim status.', type: 'error' });
              }
            };
            return (
              <SectionCard title="Insurance Claims" subtitle={`${customerClaims.length} claim(s) submitted by this customer.`}>
                {customerClaims.length === 0 ? <div className="empty-state">No insurance claims filed by this customer.</div> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>{['Reference', 'Policy', 'Type', 'Amount', 'Incident Date', 'Submitted', 'Status', 'Action'].map(TH)}</tr></thead>
                      <tbody>
                        {customerClaims.map((cl, i) => {
                          const sm = STATUS_MAP[cl.status] || STATUS_MAP.PENDING;
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{cl.ref}</td>
                              <td style={{ padding: '0.6rem 0.75rem' }}>{cl.policy}</td>
                              <td style={{ padding: '0.6rem 0.75rem' }}>{cl.type}</td>
                              <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{formatINR(cl.amount)}</td>
                              <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>{formatDateIN(cl.incidentDate)}</td>
                              <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>{formatDateIN(cl.submittedAt)}</td>
                              <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: sm.color }}>{sm.label}</td>
                              <td style={{ padding: '0.6rem 0.75rem' }}>
                                {cl.status === 'PENDING' && (
                                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <button className="button button--sm button--primary" onClick={() => updateClaimStatus(cl.id, cl.ref, 'APPROVED')}>Approve</button>
                                    <button className="button button--sm button--ghost" onClick={() => updateClaimStatus(cl.id, cl.ref, 'SETTLED')}>Settle</button>
                                    <button className="button button--sm button--ghost-danger" onClick={() => updateClaimStatus(cl.id, cl.ref, 'DECLINED')}>Decline</button>
                                  </div>
                                )}
                                {cl.status === 'APPROVED' && <button className="button button--sm button--ghost" onClick={() => updateClaimStatus(cl.id, cl.ref, 'SETTLED')}>Mark Settled</button>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            );
          })()}

          {/* ── REWARDS TAB ── */}
          {tab360 === 'rewards' && (() => {
            const redeemedPts = customerRewards.reduce((acc, r) => acc + (r.points || 0), 0);
            const basePoints = 850;
            const totalPts = Math.max(0, basePoints - redeemedPts);
            return (
              <SectionCard title="Rewards & Redemptions" subtitle={`Balance: ${totalPts} pts · Redeemed: ${redeemedPts} pts`}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  {[['Earned', basePoints, '#2563eb'], ['Redeemed', redeemedPts, '#d97706'], ['Balance', totalPts, '#16a34a']].map(([lbl, val, color]) => (
                    <div key={lbl} style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--panel-soft)', border: '1px solid var(--line)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 500, marginBottom: '0.2rem' }}>{lbl}</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color }}>{val}</div>
                    </div>
                  ))}
                </div>
                {customerRewards.length === 0 ? <div className="empty-state">No redemptions recorded for this customer.</div> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>{['Mode', 'Points Used', 'Value', 'Brand / Voucher', 'Redeemed On'].map(TH)}</tr></thead>
                      <tbody>
                        {customerRewards.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>{r.mode}</td>
                            <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#d97706' }}>{r.points}</td>
                            <td style={{ padding: '0.6rem 0.75rem' }}>{r.value ? `₹${Number(r.value).toLocaleString('en-IN')}` : '—'}</td>
                            <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>{r.brand || r.voucherCode || '—'}</td>
                            <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>{formatDateIN(r.redeemedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            );
          })()}

          {/* ── ACTIVITY LOG TAB ── */}
          {tab360 === 'activity' && (() => {
            const TX_META = {
              DEPOSIT:         { icon: '', label: 'Deposit' },
              WITHDRAWAL:      { icon: '', label: 'Withdrawal' },
              TRANSFER_OUT:    { icon: '', label: 'Transfer sent' },
              TRANSFER_IN:     { icon: '', label: 'Transfer received' },
              NEFT:            { icon: '', label: 'NEFT transfer' },
              IMPS:            { icon: '', label: 'IMPS transfer' },
              RTGS:            { icon: '', label: 'RTGS transfer' },
              INTEREST_CREDIT: { icon: '', label: 'Interest credited' },
              ACCOUNT_OPENING: { icon: '', label: 'Account opened' },
              BILL_PAYMENT:    { icon: '', label: 'Bill payment' },
            };
            return (
              <SectionCard title="Transaction Activity" subtitle={`${customerTxns.length} transaction(s) for this customer.`}>
                {customerTxns.length === 0 ? (
                  <div className="empty-state">No transactions found for this customer's accounts.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                          {['Time', 'Type', 'Account', 'Amount', 'Balance After', 'Reference'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {customerTxns.slice(0, 100).map((tx, i) => {
                          const meta = TX_META[tx.transactionType] || { icon: '', label: tx.transactionType };
                          const isCredit = ['DEPOSIT','TRANSFER_IN','INTEREST_CREDIT','ACCOUNT_OPENING'].includes(tx.transactionType);
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                {new Date(tx.transactionDateAndTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{meta.icon} {meta.label}</td>
                              <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{tx.accountNumber}</td>
                              <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: isCredit ? '#16a34a' : '#e11d48' }}>
                                {isCredit ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                              </td>
                              <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>₹{Number(tx.balanceAfterTransaction).toLocaleString('en-IN')}</td>
                              <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--muted)' }}>{tx.transactionReference}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            );
          })()}
        </>
      )}

      {/* ── BLOCK CUSTOMER CONFIRM ── */}
      {blockConfirm && (
        <div className="modal-overlay" onClick={() => setBlockConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ borderTop: '4px solid #7c3aed' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem' }}>🚫</span>
              <h3 style={{ color: '#7c3aed', margin: 0 }}>Block Customer Access</h3>
            </div>
            <p>
              You are about to <strong>immediately block</strong> <strong>{customer?.customerName}</strong>'s access to all Nova Bank services. This includes:
            </p>
            <ul style={{ margin: '0.75rem 0 0.75rem 1.2rem', lineHeight: '1.8', color: 'var(--muted)', fontSize: '0.875rem' }}>
              <li>Login and authentication</li>
              <li>Fund transfers and payments</li>
              <li>Account access and transactions</li>
              <li>All online banking features</li>
            </ul>
            <p style={{ fontSize: '0.85rem', color: '#7c3aed', fontWeight: 600, marginTop: '0.5rem' }}>
              This takes effect immediately. The customer will not be able to log in until unblocked by an admin.
            </p>
            <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
              <button className="button button--ghost" onClick={() => setBlockConfirm(false)}>Cancel</button>
              <button
                className="button"
                style={{ background: '#7c3aed', color: '#fff', borderColor: '#7c3aed' }}
                onClick={blockCustomer}
              >
                🚫 Confirm Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CUSTOMER CONFIRM ── */}
      {editAccountModal && (
        <div className="modal-overlay" onClick={() => setEditAccountModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Account</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Account: <strong style={{ fontFamily: 'monospace' }}>{editAccountModal.accountNumber}</strong>
            </p>
            <div className="stack-form">
              <label>
                <span>Status</span>
                <select value={editAccountModal.status} onChange={e => setEditAccountModal(p => ({ ...p, status: e.target.value }))}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PENDING">PENDING</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="DECLINED">DECLINED</option>
                </select>
              </label>
              <label>
                <span>Interest Rate (% p.a.)</span>
                <input type="number" step="0.01" min="0" max="20" value={editAccountModal.interestRate} onChange={e => setEditAccountModal(p => ({ ...p, interestRate: e.target.value }))} />
              </label>
              <div className="modal-actions">
                <button className="button button--ghost" onClick={() => setEditAccountModal(null)}>Cancel</button>
                <button className="button button--primary" disabled={editAccLoading} onClick={saveEditAccount}>{editAccLoading ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Send Termination Notice</h3>
            <p>
              We will notify <strong>{customer?.customerName}</strong> that their account has been flagged as inactive
              and will be <strong>automatically deleted within 21 days</strong> if no activity is recorded.
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              The customer will receive an in-app notification on their next login. If no response within 21 days,
              the account and all associated data will be permanently removed.
            </p>
            <div className="modal-actions">
              <button className="button button--ghost" onClick={() => setDeleteConfirm(false)}>Cancel</button>
              <button className="button button--danger" onClick={deleteCustomer}>Send Notice</button>
            </div>
          </div>
        </div>
      )}

      {deleteAccountConfirm && (
        <div className="modal-overlay" onClick={() => { setDeleteAccountConfirm(null); setTransferTo(''); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Confirm account deletion</h3>
            <p>Are you sure you want to delete account <strong>{deleteAccountConfirm.accountNumber}</strong>? This action cannot be undone.</p>
            {Number(deleteAccountConfirm.balance) > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ marginBottom: '0.5rem' }}>
                  This account has a remaining balance of <strong>₹{Number(deleteAccountConfirm.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>. Enter an account number to transfer the balance to before deletion.
                </p>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontWeight: 500 }}>Transfer balance to account</span>
                  <input
                    type="text"
                    value={transferTo}
                    onChange={e => setTransferTo(e.target.value)}
                    placeholder="Enter target account number"
                    style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border, #ccc)', fontSize: '0.95rem' }}
                  />
                </label>
              </div>
            )}
            <div className="modal-actions">
              <button className="button button--ghost" onClick={() => { setDeleteAccountConfirm(null); setTransferTo(''); }}>Cancel</button>
              <button className="button button--danger" onClick={deleteAccount}>Delete account</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
