import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAutoRefresh } from '../utils/useAutoRefresh';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import TransactionsTable from '../components/TransactionsTable';
import Toast from '../components/Toast';
import api from '../services/api';
import { getLocalTransactions } from '../utils/localTransactions';

function formatAmount(amount, type) {
  const sign = type === 'DEBIT' ? '-' : '+';
  return `${sign}₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TransactionsPage() {
  const [searchParams] = useSearchParams();
  const accountFilter = searchParams.get('account') || '';

  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [localFilters, setLocalFilters] = useState({ type: 'ALL', search: '', minAmt: '', maxAmt: '' });
  const [toast, setToast] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [myAccountNumbers, setMyAccountNumbers] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (accountFilter) params.accountNumber = accountFilter;
      const [txRes, dashRes] = await Promise.all([
        api.get('/transactions', { params }),
        api.get('/customers/dashboard').catch(() => ({ data: { data: {} } })),
      ]);
      const apiTxns = txRes.data.data || [];
      const accs = dashRes.data?.data?.accounts || [];
      const accountNums = new Set(accs.map(a => a.accountNumber));
      setMyAccountNumbers([...accountNums]);

      // Merge locally-stored transactions
      const localTxns = getLocalTransactions();
      const apiIds = new Set(apiTxns.map(t => t.transactionId).filter(Boolean));
      const filtered = localTxns.filter(lt => {
        if (lt.id && apiIds.has(lt.id)) return false;
        // Filter to specific account if navigated from account detail
        if (accountFilter) {
          const txType = lt.transactionType || lt.type || '';
          // For CREDIT entries, match only the credited account — never the source account
          const matchesAccount = txType === 'CREDIT'
            ? lt._accountNumber === accountFilter
            : lt._accountNumber === accountFilter || lt.fromAccountNumber === accountFilter;
          if (!matchesAccount) return false;
        }
        // Apply date filter
        if (filters.from && lt.transactionDate && lt.transactionDate < filters.from) return false;
        if (filters.to && lt.transactionDate && lt.transactionDate > filters.to + 'T23:59:59') return false;
        // DEBIT entries: show if fromAccountNumber is one of the user's accounts
        const txType = lt.transactionType || lt.type || '';
        if (txType === 'DEBIT' || !lt._accountNumber) {
          return accountNums.size === 0 || accountNums.has(lt.fromAccountNumber) || accountNums.has(lt._accountNumber);
        }
        // CREDIT entries with _accountNumber: only show if that account belongs to this user
        if (txType === 'CREDIT' && lt._accountNumber) {
          return accountNums.size === 0 || accountNums.has(lt._accountNumber);
        }
        return true;
      });
      // Normalize local txns to match API shape
      const normalised = filtered.map(lt => ({
        transactionId: lt.id,
        transactionDate: lt.transactionDate,
        transactionDateAndTime: lt.transactionDateAndTime,
        description: lt.description || lt.transferMode || 'Transfer',
        transactionType: lt.transactionType,
        amount: lt.amount,
        balance: null,
        _isLocal: true,
      }));
      // Merge: local (newest first) + API, sorted by date desc
      const merged = [...normalised, ...apiTxns].sort((a, b) => {
        const da = new Date(a.transactionDateAndTime || a.transactionDate || 0);
        const db = new Date(b.transactionDateAndTime || b.transactionDate || 0);
        return db - da;
      });
      setTransactions(merged);
    } catch (e) {
      if (e.response?.status !== 403) setToast({ message: e.response?.data?.message || 'Unable to load transactions.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters.from, filters.to, accountFilter]);
  useAutoRefresh(load, 30000);

  const downloadStatement = () => {
    const periodLabel = filters.from || filters.to
      ? `${filters.from ? formatDate(filters.from) : 'Inception'} – ${filters.to ? formatDate(filters.to) : 'Today'}`
      : 'All time';

    const rows = transactions.map(t => `
      <tr>
        <td>${formatDate(t.transactionDate)}</td>
        <td>${t.transactionId || '—'}</td>
        <td>${t.description || t.transactionType || '—'}</td>
        <td>${t.transactionType || '—'}</td>
        <td style="text-align:right;color:${t.transactionType === 'DEBIT' ? '#c0392b' : '#27ae60'};font-weight:600">${formatAmount(t.amount, t.transactionType)}</td>
        <td style="text-align:right">₹${Number(t.balance ?? t.closingBalance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Nova Bank – Transaction Statement</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #1a1a1a;
      padding: 40px;
      position: relative;
    }
    body::before {
      content: 'NOVA BANK CONFIDENTIAL';
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 72px;
      font-weight: 900;
      letter-spacing: 6px;
      color: rgba(11, 61, 110, 0.07);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #0b3d6e; padding-bottom: 16px; }
    .bank-name { font-size: 22px; font-weight: 800; color: #0b3d6e; letter-spacing: 1px; }
    .bank-tag { font-size: 11px; color: #666; margin-top: 2px; }
    .meta { text-align: right; font-size: 12px; color: #555; line-height: 1.7; }
    .meta strong { color: #0b3d6e; }
    h2 { font-size: 15px; font-weight: 700; color: #0b3d6e; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { background: #0b3d6e; color: #fff; padding: 9px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody tr:nth-child(even) { background: #f4f8fc; }
    tbody td { padding: 8px 10px; border-bottom: 1px solid #e8edf2; font-size: 12px; vertical-align: middle; }
    tfoot td { padding: 9px 10px; font-weight: 700; font-size: 12px; border-top: 2px solid #0b3d6e; background: #f0f5fb; }
    .footer { font-size: 10px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 12px; margin-top: 16px; }
    @media print {
      body { padding: 20px; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="bank-name">NOVA BANK</div>
      <div class="bank-tag">Member of Nova Financial Group</div>
    </div>
    <div class="meta">
      <strong>Account Statement</strong><br/>
      Period: ${periodLabel}<br/>
      Generated: ${new Date().toLocaleString('en-IN')}<br/>
      Total transactions: ${transactions.length}
    </div>
  </div>
  <h2>Transaction Details</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Transaction ID</th>
        <th>Description</th>
        <th>Type</th>
        <th style="text-align:right">Amount</th>
        <th style="text-align:right">Balance</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#999">No transactions found for selected period.</td></tr>'}</tbody>
  </table>
  <div class="footer">
    This is a computer-generated statement and does not require a signature. For queries, contact support@novabank.com<br/>
    Nova Bank is regulated by the Reserve Bank of India. IFSC: NOVA0001234
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
    } else {
      setToast({ message: 'Pop-up blocked. Please allow pop-ups to download the statement.', type: 'error' });
    }
  };

  return (
    <AppShell role="CUSTOMER" title="Transaction History" subtitle={accountFilter ? `Transactions for account ${accountFilter}` : 'View and filter all your banking transactions.'}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      <SectionCard
        title="All transactions"
        subtitle="Use filters below to narrow results."
      >
        {/* Filter bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.25rem', padding: '0.85rem 1rem', background: 'var(--panel-soft)', borderRadius: '10px', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: '1 1 140px', minWidth: 120 }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>From Date</label>
            <input type="date" value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))}
              style={{ padding: '0.4rem 0.6rem', borderRadius: '7px', border: '1px solid var(--line)', fontSize: '0.85rem', background: 'var(--panel)', color: 'var(--text)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: '1 1 140px', minWidth: 120 }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>To Date</label>
            <input type="date" value={filters.to} onChange={e => setFilters(p => ({ ...p, to: e.target.value }))}
              style={{ padding: '0.4rem 0.6rem', borderRadius: '7px', border: '1px solid var(--line)', fontSize: '0.85rem', background: 'var(--panel)', color: 'var(--text)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: '1 1 110px', minWidth: 100 }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Type</label>
            <select value={localFilters.type} onChange={e => setLocalFilters(p => ({ ...p, type: e.target.value }))}
              style={{ padding: '0.4rem 0.6rem', borderRadius: '7px', border: '1px solid var(--line)', fontSize: '0.85rem', background: 'var(--panel)', color: 'var(--text)' }}>
              <option value="ALL">All</option>
              <option value="CREDIT">Credit (+)</option>
              <option value="DEBIT">Debit (−)</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: '1 1 120px', minWidth: 110 }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Min Amount (₹)</label>
            <input type="number" placeholder="e.g. 100" value={localFilters.minAmt} onChange={e => setLocalFilters(p => ({ ...p, minAmt: e.target.value }))}
              style={{ padding: '0.4rem 0.6rem', borderRadius: '7px', border: '1px solid var(--line)', fontSize: '0.85rem', background: 'var(--panel)', color: 'var(--text)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: '1 1 120px', minWidth: 110 }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Max Amount (₹)</label>
            <input type="number" placeholder="e.g. 50000" value={localFilters.maxAmt} onChange={e => setLocalFilters(p => ({ ...p, maxAmt: e.target.value }))}
              style={{ padding: '0.4rem 0.6rem', borderRadius: '7px', border: '1px solid var(--line)', fontSize: '0.85rem', background: 'var(--panel)', color: 'var(--text)' }} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', flex: '0 0 auto' }}>
            <button className="button button--secondary" onClick={load} style={{ fontSize: '0.82rem', padding: '0.42rem 0.9rem' }}>Apply Dates</button>
            <button className="button button--ghost" onClick={() => { setFilters({ from: '', to: '' }); setLocalFilters({ type: 'ALL', search: '', minAmt: '', maxAmt: '' }); }} style={{ fontSize: '0.82rem', padding: '0.42rem 0.9rem' }}>Clear All</button>
            <button className="button button--primary" onClick={downloadStatement} disabled={loading} style={{ fontSize: '0.82rem', padding: '0.42rem 0.9rem' }}>⬇ Statement</button>
          </div>
        </div>

        {(() => {
          let rows = transactions;
          if (localFilters.type !== 'ALL') rows = rows.filter(t => t.transactionType === localFilters.type);
          if (localFilters.minAmt) rows = rows.filter(t => Number(t.amount) >= Number(localFilters.minAmt));
          if (localFilters.maxAmt) rows = rows.filter(t => Number(t.amount) <= Number(localFilters.maxAmt));
          if (localFilters.search.trim()) {
            const q = localFilters.search.toLowerCase();
            rows = rows.filter(t => (t.description || '').toLowerCase().includes(q) || (t.transactionId || '').toLowerCase().includes(q));
          }
          const hasActiveFilter = localFilters.type !== 'ALL' || localFilters.search.trim() || localFilters.minAmt || localFilters.maxAmt;
          return (
            <>
              {hasActiveFilter && (
                <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                  Showing <strong>{rows.length}</strong> of {transactions.length} transaction(s)
                </div>
              )}
              {loading ? <div className="empty-state">Loading transactions...</div> : <TransactionsTable rows={rows} />}
            </>
          );
        })()}
      </SectionCard>
    </AppShell>
  );
}
