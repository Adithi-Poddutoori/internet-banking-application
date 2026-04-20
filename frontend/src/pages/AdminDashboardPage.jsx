import { useEffect, useMemo, useState } from 'react';
import { useAutoRefresh } from '../utils/useAutoRefresh';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import TransactionsTable from '../components/TransactionsTable';
import Toast from '../components/Toast';
import api from '../services/api';
import { formatCurrency, formatDate, maskAccount } from '../utils/formatters';

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [report, setReport] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [interestResult, setInterestResult] = useState(null);
  const [filters, setFilters] = useState({ from: '', to: '', minBalance: '', accountNumber: '' });
  const [notes, setNotes] = useState({});
  const [toast, setToast] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteCustomerConfirm, setDeleteCustomerConfirm] = useState(null);

  const notify = (message, type = 'success') => setToast({ message, type });

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [dashboardResponse, reportResponse, customersResponse] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/reports/transactions'),
        api.get('/admin/customers')
      ]);
      setDashboard(dashboardResponse.data.data);
      setReport(reportResponse.data.data);
      setCustomers(customersResponse.data.data);
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to load the admin console.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useAutoRefresh(loadDashboard, 5000);

  const stats = useMemo(() => {
    if (!dashboard) return [];
    return [
      ['Pending approvals', String(dashboard.pendingRequests), 'Applications waiting for review'],
      ['Active customers', String(dashboard.activeCustomers), 'Approved retail profiles'],
      ['Active accounts', String(dashboard.activeAccounts), 'Savings and term accounts'],
      ['Total deposits', formatCurrency(dashboard.totalDeposits), 'Current active account balances']
    ];
  }, [dashboard]);

  const decideApplication = async (customerId, action) => {
    try {
      await api.post(`/admin/customers/${customerId}/${action}`, { remarks: notes[customerId] || '' });
      notify(`Customer application ${action}d successfully.`);
      loadDashboard();
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Decision could not be completed.', 'error');
    }
  };

  const runReport = async () => {
    try {
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const { data } = await api.get('/admin/reports/transactions', { params });
      setReport(data.data);
      notify('Report refreshed successfully.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to generate report.', 'error');
    }
  };

  const searchCustomers = async () => {
    try {
      const params = {};
      if (filters.minBalance) params.minBalance = filters.minBalance;
      const { data } = await api.get('/admin/customers', { params });
      setCustomers(data.data);
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to search customers.', 'error');
    }
  };

  const calculateInterest = async () => {
    try {
      const { data } = await api.get(`/admin/accounts/${filters.accountNumber}/interest`);
      setInterestResult(data.data);
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Interest calculation failed.', 'error');
    }
  };

  const deleteAccount = async (accountNumber) => {
    try {
      await api.delete(`/admin/accounts/${accountNumber}`);
      notify(`Account ${accountNumber} deleted successfully.`);
      setDeleteConfirm(null);
      loadDashboard();
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to delete account.', 'error');
      setDeleteConfirm(null);
    }
  };

  const deleteCustomer = async (customerId) => {
    try {
      await api.delete(`/admin/customers/${customerId}`);
      notify('Customer deleted successfully.');
      setDeleteCustomerConfirm(null);
      loadDashboard();
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to delete customer.', 'error');
      setDeleteCustomerConfirm(null);
    }
  };

  return (
    <AppShell
      role="ADMIN"
      title="Admin operations dashboard"
      subtitle="Validate new customers, monitor portfolio health, and review money movement."
    >
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      <div className="stats-grid">
        {stats.map(([label, value, helper]) => (
          <StatCard key={label} label={label} value={value} helper={helper} />
        ))}
      </div>

      <div className="content-grid content-grid--wide">
        <SectionCard title="Pending applications" subtitle="Approve or decline customers after document validation.">
          {loading ? <div className="empty-state">Loading pending approvals...</div> : null}
          <div className="approval-list">
            {dashboard?.pendingApplications?.length ? dashboard.pendingApplications.map((item) => (
              <div className="approval-card" key={item.customerId}>
                <div className="approval-card__top">
                  <div>
                    <h3>{item.customerName}</h3>
                    <p>{item.emailId} • {item.phoneNo}</p>
                  </div>
                  <span className="pill pill--pending">{item.status}</span>
                </div>
                <div className="approval-card__meta">
                  <span>{item.requestedAccountType} request</span>
                  <span>{maskAccount(item.accountNumber)}</span>
                  <span>{formatCurrency(item.openingDeposit)}</span>
                  <span>{formatDate(item.requestedOn)}</span>
                </div>
                <textarea
                  placeholder="Optional review remarks"
                  value={notes[item.customerId] || ''}
                  onChange={(event) => setNotes((prev) => ({ ...prev, [item.customerId]: event.target.value }))}
                />
                <div className="approval-card__actions">
                  <button className="button button--secondary" onClick={() => decideApplication(item.customerId, 'approve')}>Approve</button>
                  <button className="button button--ghost-danger" onClick={() => decideApplication(item.customerId, 'decline')}>Decline</button>
                </div>
              </div>
            )) : <div className="empty-state">No pending applications right now.</div>}
          </div>
        </SectionCard>

        <SectionCard title="Interest calculator" subtitle="Validate projected interest for savings and term accounts.">
          <div className="inline-form">
            <input
              placeholder="Enter account number"
              value={filters.accountNumber}
              onChange={(event) => setFilters((prev) => ({ ...prev, accountNumber: event.target.value }))}
            />
            <button className="button button--primary" onClick={calculateInterest}>Calculate</button>
          </div>
          {interestResult ? (
            <div className="interest-result">
              <div><span>Account</span><strong>{interestResult.accountNumber}</strong></div>
              <div><span>Type</span><strong>{interestResult.accountType}</strong></div>
              <div><span>Rate</span><strong>{interestResult.interestRate}%</strong></div>
              <div><span>Base amount</span><strong>{formatCurrency(interestResult.balanceOrPrincipal)}</strong></div>
              <div><span>Estimated interest</span><strong>{formatCurrency(interestResult.estimatedAnnualInterest)}</strong></div>
              <p>{interestResult.note}</p>
            </div>
          ) : <div className="empty-state">Run the calculator using any existing account number.</div>}
        </SectionCard>
      </div>

      <div className="content-grid content-grid--wide">
      <SectionCard
        title="Transaction reporting"
        subtitle="Filter reporting dates to review portfolio money movement."
        actions={
          <div className="filters-row">
            <input type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} />
            <input type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} />
            <button className="button button--secondary" onClick={runReport}>Refresh report</button>
          </div>
        }
      >
        <div className="report-summary">
          <div><span>Total transactions</span><strong>{report?.totalTransactions || 0}</strong></div>
          <div><span>Total credits</span><strong style={{ color: '#16a34a' }}>{formatCurrency(report?.totalCredits || 0)}</strong></div>
          <div><span>Total debits</span><strong style={{ color: '#e11d48' }}>{formatCurrency(report?.totalDebits || 0)}</strong></div>
          <div><span>Net volume</span><strong>{formatCurrency((report?.totalCredits || 0) - (report?.totalDebits || 0))}</strong></div>
        </div>
        <TransactionsTable rows={report?.transactions || []} />
      </SectionCard>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* ── Credit vs Debit visual ── */}
        <SectionCard title="Credit vs Debit" subtitle="Volume split for the current report period.">
          {(() => {
            const credits = Number(report?.totalCredits || 0);
            const debits  = Number(report?.totalDebits  || 0);
            const total   = credits + debits || 1;
            const creditPct = Math.round((credits / total) * 100);
            const debitPct  = 100 - creditPct;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[['Credits', credits, creditPct, '#16a34a', '#dcfce7'], ['Debits', debits, debitPct, '#e11d48', '#fee2e2']].map(([label, val, pct, color, bg]) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 600, color }}>{label}</span>
                      <span style={{ color: 'var(--muted)' }}>{formatCurrency(val)} · {pct}%</span>
                    </div>
                    <div style={{ height: '10px', borderRadius: '99px', background: 'var(--line)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: '99px', background: color, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'right', marginTop: '0.1rem' }}>
                  {report?.totalTransactions || 0} transaction(s) in period
                </div>
              </div>
            );
          })()}
        </SectionCard>

        {/* ── Customer health ── */}
        <SectionCard title="Customer health" subtitle="Snapshot of current customer and account status.">
          {(() => {
            const approved  = customers.filter(c => c.status === 'APPROVED').length;
            const pending   = customers.filter(c => c.status === 'PENDING').length;
            const declined  = customers.filter(c => c.status === 'DECLINED').length;
            const allAccs   = customers.flatMap(c => c.accounts || []);
            const activeAccs  = allAccs.filter(a => a.status === 'ACTIVE').length;
            const closedAccs  = allAccs.filter(a => a.status !== 'ACTIVE').length;
            const avgBalance  = allAccs.length ? allAccs.reduce((s, a) => s + Number(a.balance || 0), 0) / allAccs.length : 0;
            const rows = [
              ['✅ Approved customers', approved,             '#16a34a'],
              ['⏳ Pending approvals',  pending,              '#d97706'],
              ['❌ Declined',           declined,             '#e11d48'],
              ['🏦 Active accounts',    activeAccs,           '#2563eb'],
              ['🔒 Closed / Inactive',  closedAccs,           '#64748b'],
              ['📊 Avg. balance',       formatCurrency(avgBalance), '#7c3aed'],
            ];
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {rows.map(([label, value, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{label}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color }}>{value}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </SectionCard>

        {/* ── Avg transaction size ── */}
        <SectionCard title="Avg transaction size" subtitle="Mean value per transaction in the report period.">
          {(() => {
            const txns = report?.transactions || [];
            const avg  = txns.length ? txns.reduce((s, t) => s + Number(t.amount || 0), 0) / txns.length : 0;
            const max  = txns.length ? Math.max(...txns.map(t => Number(t.amount || 0))) : 0;
            const min  = txns.length ? Math.min(...txns.map(t => Number(t.amount || 0))) : 0;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {[['Average', avg], ['Largest', max], ['Smallest', min]].map(([lbl, val]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{lbl}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{formatCurrency(val)}</span>
                  </div>
                ))}
                {txns.length === 0 && <div className="empty-state" style={{ padding: '0.5rem 0' }}>No transactions in period.</div>}
              </div>
            );
          })()}
        </SectionCard>
      </div>
      </div>

      <SectionCard
        title="Customer portfolio review"
        subtitle="Search approved and pending customers, optionally by minimum balance."
        actions={
          <div className="filters-row">
            <input
              type="number"
              placeholder="Min balance"
              value={filters.minBalance}
              onChange={(e) => setFilters((p) => ({ ...p, minBalance: e.target.value }))}
            />
            <button className="button button--secondary" onClick={searchCustomers}>Search</button>
          </div>
        }
      >
        <div className="list-block">
          {customers?.length ? customers.map((customer) => (
            <div className="list-item" key={customer.id}>
              <div className="list-item__info">
                <strong>{customer.customerName}</strong>
                <span>{customer.emailId} • {customer.phoneNo} • {customer.userId}</span>
                {customer.accounts?.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {customer.accounts.map((acc) => (
                      <span key={acc.accountNumber} className={`pill pill--${acc.status.toLowerCase()}`} style={{ cursor: 'default' }}>
                        {maskAccount(acc.accountNumber)} • {acc.accountType} • {formatCurrency(acc.balance)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="list-item__actions">
                <span className={`pill pill--${customer.status.toLowerCase()}`}>{customer.status}</span>
                {customer.accounts?.map((acc) => (
                  <button
                    key={acc.accountNumber}
                    className="button button--danger button--small"
                    onClick={() => setDeleteConfirm(acc.accountNumber)}
                    title={`Delete account ${acc.accountNumber}`}
                  >
                    Delete {maskAccount(acc.accountNumber)}
                  </button>
                ))}
                <button
                  className="button button--danger button--small"
                  onClick={() => setDeleteCustomerConfirm(customer.id)}
                  title={`Delete customer ${customer.customerName}`}
                >
                  Delete customer
                </button>
              </div>
            </div>
          )) : <div className="empty-state">No customers found for the selected search.</div>}
        </div>
      </SectionCard>

      <SectionCard title="Recent operations feed" subtitle="Latest transaction activity across the bank.">
        <TransactionsTable rows={dashboard?.recentTransactions || []} />
      </SectionCard>

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm account deletion</h3>
            <p>Are you sure you want to delete account <strong>{deleteConfirm}</strong>? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="button button--ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="button button--danger" onClick={() => deleteAccount(deleteConfirm)}>Delete account</button>
            </div>
          </div>
        </div>
      )}

      {deleteCustomerConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteCustomerConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm customer deletion</h3>
            <p>Are you sure you want to delete this customer and all associated data? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="button button--ghost" onClick={() => setDeleteCustomerConfirm(null)}>Cancel</button>
              <button className="button button--danger" onClick={() => deleteCustomer(deleteCustomerConfirm)}>Delete customer</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
