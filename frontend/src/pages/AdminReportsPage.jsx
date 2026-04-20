import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import TransactionsTable from '../components/TransactionsTable';
import Toast from '../components/Toast';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminReportsPage() {
  const [report, setReport] = useState(null);
  const [interestResult, setInterestResult] = useState(null);
  const [filters, setFilters] = useState({ from: '', to: '', accountNumber: '' });
  const [toast, setToast] = useState({ message: '', type: '' });

  const loadReport = async () => {
    try {
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const { data } = await api.get('/admin/reports/transactions', { params });
      setReport(data.data);
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Unable to load report.', type: 'error' });
    }
  };

  useEffect(() => { loadReport(); }, []);

  const calculateInterest = async () => {
    if (!filters.accountNumber) return setToast({ message: 'Enter an account number first.', type: 'error' });
    try {
      const { data } = await api.get(`/admin/accounts/${filters.accountNumber}/interest`);
      setInterestResult(data.data);
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Interest calculation failed.', type: 'error' });
    }
  };

  const downloadReport = () => {
    if (!report) return setToast({ message: 'Load a report first before downloading.', type: 'error' });
    const periodLabel = filters.from || filters.to
      ? `${filters.from ? fmtDate(filters.from) : 'Inception'} – ${filters.to ? fmtDate(filters.to) : 'Today'}`
      : 'All time';

    const txRows = (report.transactions || []).map(t => `
      <tr>
        <td>${fmtDate(t.transactionDate)}</td>
        <td>${t.transactionId || '—'}</td>
        <td>${t.description || t.transactionType || '—'}</td>
        <td>${t.transactionType || '—'}</td>
        <td style="text-align:right;color:${t.transactionType === 'DEBIT' ? '#c0392b' : '#27ae60'};font-weight:600">
          ${t.transactionType === 'DEBIT' ? '-' : '+'}₹${Number(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </td>
        <td style="text-align:right">₹${Number(t.balance ?? t.closingBalance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Nova Bank – Admin Transaction Report</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 40px; position: relative; }
    body::before {
      content: 'NOVA BANK — ADMIN REPORT';
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 64px; font-weight: 900; letter-spacing: 4px;
      color: rgba(11,61,110,0.07); white-space: nowrap;
      pointer-events: none; z-index: 0;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #0b3d6e; padding-bottom: 14px; }
    .bank-name { font-size: 22px; font-weight: 800; color: #0b3d6e; }
    .bank-tag { font-size: 11px; color: #666; margin-top: 2px; }
    .meta { text-align: right; font-size: 12px; color: #555; line-height: 1.7; }
    .summary { display: flex; gap: 20px; margin-bottom: 20px; }
    .summary-card { flex: 1; border: 1px solid #dde4ec; border-radius: 8px; padding: 14px 18px; background: #f8fafd; }
    .summary-card span { display: block; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-card strong { font-size: 18px; color: #0b3d6e; }
    h2 { font-size: 14px; font-weight: 700; color: #0b3d6e; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead th { background: #0b3d6e; color: #fff; padding: 9px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody tr:nth-child(even) { background: #f4f8fc; }
    tbody td { padding: 8px 10px; border-bottom: 1px solid #e8edf2; font-size: 12px; }
    .footer { font-size: 10px; color: #999; text-align: center; border-top:1px solid #ddd; padding-top: 12px; margin-top: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="bank-name">NOVA BANK</div>
      <div class="bank-tag">Admin — Transaction Report</div>
    </div>
    <div class="meta">
      <strong>Transaction Report</strong><br/>
      Period: ${periodLabel}<br/>
      Generated: ${new Date().toLocaleString('en-IN')}
    </div>
  </div>
  <div class="summary">
    <div class="summary-card"><span>Total Transactions</span><strong>${report.totalTransactions || 0}</strong></div>
    <div class="summary-card"><span>Total Credits</span><strong>₹${Number(report.totalCredits || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
    <div class="summary-card"><span>Total Debits</span><strong>₹${Number(report.totalDebits || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
  </div>
  <h2>Transaction Details</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Transaction ID</th><th>Description</th><th>Type</th><th style="text-align:right">Amount</th><th style="text-align:right">Balance</th></tr>
    </thead>
    <tbody>${txRows || '<tr><td colspan="6" style="text-align:center;padding:18px;color:#999">No transactions for selected period.</td></tr>'}</tbody>
  </table>
  <div class="footer">
    Confidential — For internal use only. Nova Bank is regulated by the Reserve Bank of India.
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
    else setToast({ message: 'Pop-up blocked. Please allow pop-ups to download the report.', type: 'error' });
  };

  return (
    <AppShell role="ADMIN" title="Reports" subtitle="Transaction reporting and interest calculation tools.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      <SectionCard
        title="Transaction reporting"
        subtitle="Filter by date range to review portfolio money movement."
        actions={
          <div className="filters-row">
            <input type="date" value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} />
            <input type="date" value={filters.to} onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} />
            <button className="button button--secondary" onClick={loadReport}>Refresh report</button>
            <button className="button button--primary" onClick={downloadReport} disabled={!report}>⬇ Download Report</button>
          </div>
        }
      >
        {report ? (
          <>
            <div className="report-summary">
              <div><span>Total transactions</span><strong>{report.totalTransactions || 0}</strong></div>
              <div><span>Total credits</span><strong>{formatCurrency(report.totalCredits)}</strong></div>
              <div><span>Total debits</span><strong>{formatCurrency(report.totalDebits)}</strong></div>
            </div>
            <TransactionsTable rows={report.transactions || []} />
          </>
        ) : <div className="empty-state">Loading report data...</div>}
      </SectionCard>

      <SectionCard title="Interest calculator" subtitle="Validate projected interest for savings and term accounts.">
        <div className="inline-form">
          <input
            placeholder="Enter account number"
            value={filters.accountNumber}
            onChange={e => setFilters(p => ({ ...p, accountNumber: e.target.value }))}
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
    </AppShell>
  );
}
