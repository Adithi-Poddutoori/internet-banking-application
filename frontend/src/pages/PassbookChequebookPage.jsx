import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import WorkflowModal from '../components/WorkflowModal';
import { addProduct, hasProduct, getCategoryProducts, getProductHistory } from '../utils/products';
import { downloadFile } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { BRANCHES } from '../utils/branches';

const PASSBOOK_OPTIONS = [
  {
    icon: '',
    title: 'Standard Passbook',
    desc: 'A physical passbook recording all transactions. Issued free of charge.',
    features: ['All transactions recorded', 'Free of cost', 'Issued within 3–5 working days', 'Physical branch pickup'],
    steps: ['Submit passbook request', 'Admin verifies linked account', 'Passbook printed and dispatched', 'Received at registered address'],
  },
  {
    icon: '',
    title: 'Premium Passbook',
    desc: 'A premium hardcover passbook with transaction history pre-printed.',
    features: ['Pre-printed last 12 months history', 'Hardcover binding', 'Express delivery in 2–3 days', 'Nominal charges apply'],
    steps: ['Submit premium request', 'Payment deducted from account', 'Admin approves and dispatches', 'Express delivery to address'],
  },
];

const CHEQUEBOOK_OPTIONS = [
  {
    icon: '',
    title: 'Chequebook — 10 leaves',
    desc: 'Standard 10-leaf chequebook for regular transactions.',
    price: '₹150',
    features: ['10 cheque leaves', 'Valid for 5 years', 'Free first issuance · ₹150/reorder', 'Delivered in 5–7 days'],
    steps: ['Submit chequebook request', 'Signature verification by admin', 'Chequebook printed at branch', 'Dispatched to registered address'],
  },
  {
    icon: '',
    title: 'Chequebook — 25 leaves',
    desc: 'Standard 25-leaf chequebook for frequent users.',
    price: '₹200',
    features: ['25 cheque leaves', 'Valid for 5 years', 'Charges: ₹200', 'Delivered in 5–7 days'],
    steps: ['Submit chequebook request', 'Signature verification by admin', 'Chequebook printed at branch', 'Dispatched to registered address'],
  },
  {
    icon: '',
    title: 'Chequebook — 50 leaves',
    desc: 'High-volume chequebook for businesses and frequent issuers.',
    price: '₹350',
    features: ['50 cheque leaves', 'Valid for 5 years', 'Charges: ₹350 · Priority processing', 'Delivered in 3–5 days'],
    steps: ['Submit chequebook request', 'Business account verification', 'Priority printing at branch', 'Express dispatch'],
  },
];

const category = 'passbook_chequebook';

const STATEMENT_PERIODS = ['Last 1 month', 'Last 3 months', 'Last 6 months', 'Last 1 year', 'Financial year 2025-26', 'Financial year 2024-25'];

export default function PassbookChequebookPage() {
  const [toast, setToast] = useState({ message: '', type: '' });
  const [, refresh] = useState(0);
  const { user } = useAuth();
  const [workflow, setWorkflow] = useState(null);
  const [tab, setTab] = useState('services');
  const [dlConfirm, setDlConfirm] = useState(null);
  // Stop cheque
  const [stopFrom, setStopFrom] = useState('');
  const [stopTo, setStopTo] = useState('');
  const [stopReason, setStopReason] = useState('');
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [stoppedCheques, setStoppedCheques] = useState([]);

  // Load stopped cheques from backend on mount
  useEffect(() => {
    api.get('/stopped-cheques/my')
      .then(r => setStoppedCheques(r.data?.data || []))
      .catch(() => {
        // Fallback to localStorage
        try { setStoppedCheques(JSON.parse(localStorage.getItem('nova_stopped_cheques') || '[]')); } catch { /* ignore */ }
      });
  }, []);
  const [issuedCheques] = useState(() => {
    const key = 'nova_issued_cheques';
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved && saved.length) return saved;
    } catch { /* ignore */ }
    const base = 100100 + Math.floor(Math.random() * 900);
    const payees = ['Rent Payment', 'Supplier Invoice', 'Utility Bill', 'Employee Salary', 'Vendor Payment', 'Maintenance', 'Contractor', 'Insurance Premium', 'College Fees', 'Grocery Vendor'];
    const amounts = [25000, 12500, 3400, 45000, 8750, 6200, 18000, 5500, 30000, 2200];
    const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'CLEARED', 'ACTIVE', 'ACTIVE', 'CLEARED', 'ACTIVE', 'ACTIVE', 'ACTIVE'];
    const now = new Date();
    const list = statuses.map((status, i) => {
      const d = new Date(now); d.setDate(d.getDate() - i * 6);
      return {
        chequeNo: String(base + i).padStart(6, '0'),
        payee: payees[i],
        amount: amounts[i],
        date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`,
        status,
      };
    });
    localStorage.setItem(key, JSON.stringify(list));
    return list;
  });
  // Statement
  const [stmtPeriod, setStmtPeriod] = useState(STATEMENT_PERIODS[1]);
  const [stmtFormat, setStmtFormat] = useState('PDF');
  // Preferences
  const [prefs, setPrefs] = useState({ paperless: true, emailAlerts: true, smsAlerts: true, twoFactor: false });
  // Locker
  const [lockerBranch, setLockerBranch] = useState('');
  const [lockerSize, setLockerSize] = useState('Small');
  const [myLockerRequests, setMyLockerRequests] = useState([]);
  const [lockerLoading, setLockerLoading] = useState(false);

  useEffect(() => {
    api.get('/locker-requests/my')
      .then(r => setMyLockerRequests(r.data?.data || []))
      .catch(() => {});
  }, []);

  const pending = getCategoryProducts(category);
  const history = getProductHistory().filter(h => h.category === category);

  const getStatus = (title) => {
    const h = history.find(x => x.title === title);
    if (h) return h.decision;
    if (hasProduct(category, title)) return 'PENDING';
    return null;
  };

  const confirmRequest = (item) => {
    addProduct(category, item.title);
    setToast({ message: `Your "${item.title}" request has been submitted and is pending admin approval.`, type: 'success' });
    setWorkflow(null);
    refresh(n => n + 1);
  };

  const submitStopCheque = async () => {
    if (!stopFrom.trim()) return setToast({ message: 'Enter cheque number to stop.', type: 'error' });
    const range = stopTo.trim() ? ` to #${stopTo}` : '';
    const nums = stopTo.trim()
      ? issuedCheques.filter(c => c.chequeNo >= stopFrom && c.chequeNo <= stopTo).map(c => c.chequeNo)
      : [stopFrom.trim()];
    // Normalise existing entries to objects for comparison
    const existing = stoppedCheques.map(e => typeof e === 'string' ? { chequeNo: e } : e);
    const existingNums = new Set(existing.map(e => e.chequeNo));
    const newNums = nums.filter(n => !existingNums.has(n));

    const saved = [];
    for (const chequeNo of newNums) {
      try {
        const res = await api.post('/stopped-cheques', { chequeNo, reason: stopReason.trim() || '' });
        saved.push(res.data?.data || { chequeNo, customerName: user?.displayName || user?.customerName || user?.username || '', username: user?.username || '', stoppedAt: new Date().toISOString(), reason: stopReason.trim() || '' });
      } catch {
        // Fallback to localStorage for this number
        saved.push({
          chequeNo,
          customerName: user?.displayName || user?.customerName || user?.username || '',
          username: user?.username || '',
          stoppedAt: new Date().toISOString(),
          reason: stopReason.trim() || '',
        });
      }
    }

    const next = [...existing, ...saved];
    setStoppedCheques(next);
    localStorage.setItem('nova_stopped_cheques', JSON.stringify(next));
    setToast({ message: `Stop payment for cheque #${stopFrom}${range} submitted. Effective immediately.`, type: 'success' });
    setStopFrom(''); setStopTo(''); setStopReason('');
    setStopModalOpen(false);
  };

  const downloadStatement = () => {
    const now = new Date();
    const txns = [
      [new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-IN'), 'Opening Balance', '', '', '52340.00'],
      [new Date(now.getFullYear(), now.getMonth() - 1, 3).toLocaleDateString('en-IN'), 'UPI Transfer to Merchant', '1200.00', '', '51140.00'],
      [new Date(now.getFullYear(), now.getMonth() - 1, 7).toLocaleDateString('en-IN'), 'Salary Credit', '', '45000.00', '96140.00'],
      [new Date(now.getFullYear(), now.getMonth() - 1, 10).toLocaleDateString('en-IN'), 'ATM Withdrawal', '5000.00', '', '91140.00'],
      [new Date(now.getFullYear(), now.getMonth() - 1, 15).toLocaleDateString('en-IN'), 'NEFT Received', '', '8500.00', '99640.00'],
      [new Date(now.getFullYear(), now.getMonth() - 1, 18).toLocaleDateString('en-IN'), 'Bill Payment - Electricity', '2340.00', '', '97300.00'],
      [new Date(now.getFullYear(), now.getMonth() - 1, 22).toLocaleDateString('en-IN'), 'SIP Auto-debit', '2000.00', '', '95300.00'],
      [new Date(now.getFullYear(), now.getMonth() - 1, 28).toLocaleDateString('en-IN'), 'Interest Credit', '', '312.00', '95612.00'],
      [new Date(now.getFullYear(), now.getMonth(), 2).toLocaleDateString('en-IN'), 'UPI Payment - Grocery', '3450.00', '', '92162.00'],
      [new Date(now.getFullYear(), now.getMonth(), 5).toLocaleDateString('en-IN'), 'Salary Credit', '', '45000.00', '137162.00'],
      [new Date(now.getFullYear(), now.getMonth(), 8).toLocaleDateString('en-IN'), 'Online Shopping', '7200.00', '', '129962.00'],
      [new Date(now.getFullYear(), now.getMonth(), 12).toLocaleDateString('en-IN'), 'Cheque Cleared', '25000.00', '', '104962.00'],
    ];

    if (stmtFormat === 'CSV') {
      const rows = ['Date,Description,Debit (INR),Credit (INR),Balance (INR)'];
      txns.forEach(r => rows.push(r.join(',')));
      downloadFile(`account_statement_${stmtPeriod.replace(/ /g, '_')}.csv`, '\uFEFF' + rows.join('\n'), 'text/csv;charset=utf-8');
      setToast({ message: `CSV statement for "${stmtPeriod}" downloaded.`, type: 'success' });
    } else {
      // PDF — open print-ready HTML
      const tableRows = txns.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td style="text-align:right;color:${r[2] ? '#c0392b' : '#888'}">${r[2] ? '₹' + r[2] : '—'}</td><td style="text-align:right;color:${r[3] ? '#27ae60' : '#888'}">${r[3] ? '₹' + r[3] : '—'}</td><td style="text-align:right;font-weight:600">₹${r[4]}</td></tr>`).join('');
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Nova Bank – Account Statement</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 40px; position: relative; }
    body::before { content: 'NOVA BANK CONFIDENTIAL'; position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-45deg); font-size: 72px; font-weight: 900; letter-spacing: 6px; color: rgba(11,61,110,0.07); white-space: nowrap; pointer-events: none; z-index: 0; }
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
    .footer { font-size: 10px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 12px; margin-top: 16px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div><div class="bank-name">NOVA BANK</div><div class="bank-tag">Member of Nova Financial Group</div></div>
    <div class="meta"><strong>Account Statement</strong><br/>Period: ${stmtPeriod}<br/>Generated: ${now.toLocaleString('en-IN')}</div>
  </div>
  <h2>Transaction Details</h2>
  <table>
    <thead><tr><th>Date</th><th>Description</th><th style="text-align:right">Debit (₹)</th><th style="text-align:right">Credit (₹)</th><th style="text-align:right">Balance (₹)</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">This is a computer-generated statement and does not require a signature. For queries, contact support@novabank.com<br/>Nova Bank is regulated by the Reserve Bank of India. IFSC: NOVA0001234</div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
      else setToast({ message: 'Pop-up blocked. Please allow pop-ups to download the PDF.', type: 'error' });
      setToast({ message: `PDF statement for "${stmtPeriod}" opened for printing/saving.`, type: 'success' });
    }
  };

  const togglePref = (key) => {
    setPrefs(p => {
      const next = { ...p, [key]: !p[key] };
      const label = { paperless: 'Paperless statements', emailAlerts: 'Email alerts', smsAlerts: 'SMS alerts', twoFactor: 'Two-factor authentication' }[key];
      setToast({ message: `${label} ${next[key] ? 'enabled' : 'disabled'}.`, type: 'info' });
      return next;
    });
  };

  const submitLockerRequest = async () => {
    if (!lockerBranch.trim()) return setToast({ message: 'Select your preferred branch.', type: 'error' });
    setLockerLoading(true);
    try {
      const res = await api.post('/locker-requests', { branch: lockerBranch, size: lockerSize });
      setMyLockerRequests(prev => [res.data.data, ...prev]);
      setToast({ message: `Locker request (${lockerSize}) at "${lockerBranch}" submitted. Branch will contact you within 3 working days.`, type: 'success' });
      setLockerBranch('');
      setLockerSize('Small');
    } catch {
      setToast({ message: 'Failed to submit locker request. Please try again.', type: 'error' });
    } finally {
      setLockerLoading(false);
    }
  };

  return (
    <AppShell role="CUSTOMER" title="Services" subtitle="Request passbooks, chequebooks, statements and manage account preferences.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      <WorkflowModal {...(workflow || {})} open={!!workflow} onClose={() => setWorkflow(null)} />

      {(pending.length > 0 || history.length > 0) && (
        <SectionCard title="My requests" subtitle={`${pending.length + history.length} request(s) on record.`}>
          <div className="my-products-strip">
            {pending.map((p, i) => <span key={i} className="my-product-chip">📄 {p.title} — <em>Pending admin approval</em></span>)}
            {history.map((h, i) => (
              <span key={`h-${i}`} className={`my-product-chip my-product-chip--${h.decision === 'APPROVED' ? 'approved' : 'declined'}`}>
                {h.decision === 'APPROVED' ? '✅' : '❌'} {h.title} — <em>{h.decision === 'APPROVED' ? 'Approved' : 'Declined'}</em>
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: '1.25rem' }}>
        <button className={`tab-bar__tab${tab === 'services' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('services')}>Passbook & Cheque</button>
        <button className={`tab-bar__tab${tab === 'statement' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('statement')}>Statement</button>
        <button className={`tab-bar__tab${tab === 'cheque' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('cheque')}>Stop Cheque</button>
        <button className={`tab-bar__tab${tab === 'more' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('more')}>More</button>
      </div>

      {tab === 'services' && (
        <>
          <SectionCard title="Passbook options" subtitle="Request a physical passbook for your savings account.">
            <div className="showcase-grid">
              {PASSBOOK_OPTIONS.map((item, i) => {
                const status = getStatus(item.title);
                return (
                  <SectionCard key={i} title={`${item.icon} ${item.title}`} subtitle={item.desc}>
                    <ul className="showcase-features">{item.features.map((f, j) => <li key={j}>{f}</li>)}</ul>
                    {status === 'APPROVED' && <span className="badge badge--success">✅ Approved</span>}
                    {status === 'DECLINED' && <span className="badge badge--error">❌ Declined</span>}
                    {status === 'PENDING' && <span className="badge badge--warning">⏳ Pending Approval</span>}
                    {!status && (
                      <button className="button button--sm button--primary" onClick={() => setWorkflow({
                        icon: item.icon, title: `Request ${item.title}`, subtitle: item.desc,
                        details: item.features.map((f, fi) => [`Feature ${fi + 1}`, f]),
                        steps: item.steps, confirmLabel: 'Submit Request', onConfirm: () => confirmRequest(item),
                      })}>Request Now</button>
                    )}
                  </SectionCard>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Chequebook options" subtitle="Request a chequebook for your account. You may request multiple chequebooks.">
            <div className="showcase-grid">
              {CHEQUEBOOK_OPTIONS.map((item, i) => {
                const existingApproved = history.filter(h => h.title === item.title && h.decision === 'APPROVED').length;
                const isPending = hasProduct(category, item.title);
                return (
                  <SectionCard key={i} title={`${item.icon} ${item.title}`} subtitle={item.desc}>
                    {item.price && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.65rem', borderRadius: '6px', background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.6rem' }}>
                        {item.price}
                      </div>
                    )}
                    <ul className="showcase-features">{item.features.map((f, j) => <li key={j}>{f}</li>)}</ul>
                    {existingApproved > 0 && (
                      <span className="badge badge--success">✅ {existingApproved} issued</span>
                    )}
                    {isPending && <span className="badge badge--warning">⏳ Request pending</span>}
                    <button
                      className="button button--sm button--primary"
                      style={{ marginTop: '0.5rem' }}
                      disabled={isPending}
                      onClick={() => setWorkflow({
                        icon: item.icon, title: `Request ${item.title}`, subtitle: item.desc,
                        details: item.features.map((f, fi) => [`Feature ${fi + 1}`, f]),
                        steps: item.steps, confirmLabel: 'Submit Request', onConfirm: () => confirmRequest(item),
                      })}>
                      {isPending ? 'Pending…' : existingApproved > 0 ? '+ Request Another' : 'Request Now'}
                    </button>
                  </SectionCard>
                );
              })}
            </div>
          </SectionCard>
        </>
      )}

      {tab === 'statement' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          <SectionCard title="Download Statement" subtitle="Get your account statement for any period.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Period</span>
                <select value={stmtPeriod} onChange={e => setStmtPeriod(e.target.value)}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--panel)', fontSize: '0.9rem' }}>
                  {STATEMENT_PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Format</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['PDF', 'CSV'].map(f => (
                    <button key={f} onClick={() => setStmtFormat(f)}
                      style={{ flex: 1, padding: '0.4rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', border: `2px solid ${stmtFormat === f ? 'var(--primary)' : 'var(--line)'}`, background: stmtFormat === f ? 'var(--primary-tint, #eff6ff)' : 'var(--panel-soft)', color: stmtFormat === f ? 'var(--primary)' : 'var(--muted)' }}>
                      {f}
                    </button>
                  ))}
                </div>
              </label>
              <button className="button button--primary" onClick={() => setDlConfirm({ label: `${stmtFormat} Statement`, fn: downloadStatement })}> Download {stmtFormat}</button>
            </div>
          </SectionCard>
          <SectionCard title="Other documents" subtitle="Additional account-related downloads.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[['Account Confirmation Letter', 'Official confirmation of your bank account'], ['Balance Certificate', 'Certified balance as on today’s date'], ['Account Closure Form', 'Required to close an account at branch'], ['ECS / NACH Mandate Form', 'For setting up recurring auto-debits']].map(([label, desc]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--panel-soft)' }}>
                  <div><div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{label}</div><div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{desc}</div></div>
                  <button className="button button--sm button--ghost" onClick={() => {
                    const fn = () => {
                      const docTitle = label.replace(/^\S+ /, '');
                      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Nova Bank – ${docTitle}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #0b3d6e; padding-bottom: 16px; }
    .bank-name { font-size: 22px; font-weight: 800; color: #0b3d6e; letter-spacing: 1px; }
    .bank-tag { font-size: 11px; color: #666; margin-top: 2px; }
    .meta { text-align: right; font-size: 12px; color: #555; line-height: 1.7; }
    h2 { font-size: 17px; font-weight: 700; color: #0b3d6e; margin-bottom: 20px; }
    .body-text { font-size: 13px; line-height: 2; color: #333; }
    .footer { font-size: 10px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 12px; margin-top: 48px; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div><div class="bank-name">NOVA BANK</div><div class="bank-tag">Member of Nova Financial Group</div></div>
    <div class="meta">Generated: ${new Date().toLocaleDateString('en-IN')}<br/>Customer: Account Holder</div>
  </div>
  <h2>${docTitle}</h2>
  <div class="body-text">
    This is an official document issued by Nova Bank on request of the account holder.<br/><br/>
    Document type: <strong>${docTitle}</strong><br/>
    Date of issue: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}<br/><br/>
    For queries or assistance, please contact your nearest branch or call 1800-XXX-XXXX.
  </div>
  <div class="footer">This is a computer-generated document and does not require a signature. Nova Bank is regulated by the Reserve Bank of India.</div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
                      const w = window.open('', '_blank');
                      if (w) { w.document.write(html); w.document.close(); }
                      else setToast({ message: 'Pop-up blocked. Please allow pop-ups to download.', type: 'error' });
                      setToast({ message: `"${label}" opened for printing/saving as PDF.`, type: 'success' });
                    };
                    setDlConfirm({ label, fn });
                  }}>Download</button>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === 'cheque' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Issued Cheques List */}
          <SectionCard title="Issued Cheques" subtitle="Your issued cheque leaves — click  Stop on any active cheque to cancel it.">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--panel-soft)', textAlign: 'left' }}>
                    {['Cheque No.', 'Payee / Purpose', 'Amount', 'Date', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ padding: '0.55rem 0.75rem', fontWeight: 700, borderBottom: '2px solid var(--line)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {issuedCheques.map((c) => {
                    const stopEntry = stoppedCheques.find(s => (typeof s === 'string' ? s : s.chequeNo) === c.chequeNo);
                    const stopStatus = stopEntry ? (typeof stopEntry === 'string' ? 'APPROVED' : (stopEntry.status || 'PENDING')) : null;
                    const effectiveStatus = stopStatus === 'APPROVED' ? 'STOPPED' : stopStatus === 'PENDING' ? 'STOP PENDING' : c.status;
                    const statusColor = effectiveStatus === 'ACTIVE' ? '#16a34a' : effectiveStatus === 'STOP PENDING' ? '#d97706' : effectiveStatus === 'STOPPED' ? '#e11d48' : '#64748b';
                    const statusBg   = effectiveStatus === 'ACTIVE' ? '#f0fdf4' : effectiveStatus === 'STOP PENDING' ? '#fffbeb' : effectiveStatus === 'STOPPED' ? '#fff1f2' : 'var(--panel-soft)';
                    return (
                      <tr key={c.chequeNo} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{c.chequeNo}</td>
                        <td style={{ padding: '0.55rem 0.75rem' }}>{c.payee}</td>
                        <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>₹{Number(c.amount).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '0.55rem 0.75rem', whiteSpace: 'nowrap' }}>{c.date}</td>
                        <td style={{ padding: '0.55rem 0.75rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, background: statusBg, color: statusColor, border: `1px solid ${statusColor}44`, borderRadius: '4px', padding: '0.15rem 0.45rem' }}>{effectiveStatus}</span>
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem' }}>
                          {effectiveStatus === 'ACTIVE' && (
                            <button
                              onClick={() => { setStopFrom(c.chequeNo); setStopTo(''); setStopReason(''); setStopModalOpen(true); }}
                              style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fff1f2', color: '#e11d48', cursor: 'pointer', fontWeight: 600 }}
                            > Stop</button>
                          )}
                          {effectiveStatus === 'STOP PENDING' && (
                            <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>⏳ Awaiting admin</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Cheque tips" subtitle="Safe cheque practices.">
            <ul className="showcase-features">
              <li>Never leave amount or payee name blank</li>
              <li>Cross cheques ("A/C Payee Only") for safety</li>
              <li>Report lost chequebooks immediately</li>
              <li>Stale cheques are invalid after 3 months</li>
              <li>Post-dated cheques cannot be stopped easily</li>
              <li>Verify signature before issuing high-value cheques</li>
            </ul>
          </SectionCard>

          {/* Stop Cheque Modal */}
          {stopModalOpen && (
            <div className="modal-overlay" onClick={() => setStopModalOpen(false)}>
              <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                <h3 style={{ marginBottom: '0.25rem' }}> Stop Cheque Payment</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
                  Cancelling cheque <strong style={{ fontFamily: 'monospace', color: 'var(--danger)' }}>#{stopFrom}</strong>
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Cheque number (from) <span style={{ color: 'var(--danger)' }}>*</span></span>
                    <input type="text" placeholder="e.g. 000123" value={stopFrom} onChange={e => setStopFrom(e.target.value)}
                      style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem', fontFamily: 'monospace' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Cheque number (to) <span style={{ color: 'var(--muted)', fontWeight: 400 }}>optional, for range</span></span>
                    <input type="text" placeholder="Leave blank for single cheque" value={stopTo} onChange={e => setStopTo(e.target.value)}
                      style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem', fontFamily: 'monospace' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Reason</span>
                    <input type="text" placeholder="e.g. Lost cheque, Payment cancelled…" value={stopReason} onChange={e => setStopReason(e.target.value)}
                      style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem' }} />
                  </label>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0 }}>₹50 service charge applies. Stop is effective immediately.</p>
                </div>
                <div className="modal-actions">
                  <button className="button button--ghost" onClick={() => setStopModalOpen(false)}>Cancel</button>
                  <button className="button button--danger" onClick={submitStopCheque}>Stop Payment</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'more' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {/* Account preferences */}
          <SectionCard title="Account Preferences" subtitle="Manage how you receive alerts and statements.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[['paperless', 'Paperless statements', 'Receive statements via email instead of post'], ['emailAlerts', 'Email alerts', 'Get transaction and security alerts on email'], ['smsAlerts', 'SMS alerts', 'Receive SMS for every debit transaction']].map(([key, label, desc]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--panel-soft)' }}>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{label}</div><div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{desc}</div></div>
                  <button onClick={() => togglePref(key)}
                    style={{ marginLeft: '1rem', padding: '0.3rem 0.75rem', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: prefs[key] ? '#16a34a' : 'var(--line)', color: prefs[key] ? '#fff' : 'var(--muted)', flexShrink: 0 }}>
                    {prefs[key] ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Locker facility */}
          <SectionCard title="Safe Deposit Locker" subtitle="Request a bank locker at your nearest branch.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Preferred branch <span style={{ color: 'var(--danger)' }}>*</span></span>
                <select value={lockerBranch} onChange={e => setLockerBranch(e.target.value)}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--panel)', fontSize: '0.9rem' }}>
                  <option value="">Select a branch…</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Locker size</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['Small', 'Medium', 'Large'].map(sz => (
                    <button key={sz} onClick={() => setLockerSize(sz)}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: `2px solid ${lockerSize === sz ? 'var(--primary)' : 'var(--line)'}`, background: lockerSize === sz ? 'var(--primary-soft, #eff6ff)' : 'var(--panel)', fontWeight: lockerSize === sz ? 700 : 400, fontSize: '0.85rem', cursor: 'pointer', color: lockerSize === sz ? 'var(--primary)' : 'var(--text)' }}>
                      {sz === 'Small' ? '🗃️' : sz === 'Medium' ? '📦' : '🏗️'} {sz}
                    </button>
                  ))}
                </div>
              </label>
              <button className="button button--primary" onClick={submitLockerRequest} disabled={lockerLoading}>
                {lockerLoading ? 'Submitting…' : 'Request Locker'}
              </button>
              {myLockerRequests.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your requests</div>
                  {myLockerRequests.map(r => (
                    <div key={r.id} style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: `1.5px solid ${r.status === 'ASSIGNED' ? '#86efac' : r.status === 'DECLINED' ? '#fca5a5' : '#fcd34d'}`, background: r.status === 'ASSIGNED' ? '#f0fdf4' : r.status === 'DECLINED' ? '#fef2f2' : '#fffbeb', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 700 }}>{r.branch} — {r.size}</div>
                      {r.status === 'ASSIGNED' && r.assignedLocker && (
                        <div style={{ marginTop: '0.25rem', color: '#16a34a', fontWeight: 600 }}>✅ Locker assigned: <strong>{r.assignedLocker}</strong></div>
                      )}
                      {r.status === 'ASSIGNED' && r.adminNote && (
                        <div style={{ marginTop: '0.2rem', fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>📝 {r.adminNote}</div>
                      )}
                      {r.status === 'DECLINED' && (
                        <div style={{ marginTop: '0.25rem', color: '#e11d48' }}>❌ Request declined. Please choose another branch or size.</div>
                      )}
                      {r.status === 'PENDING' && (
                        <div style={{ marginTop: '0.25rem', color: '#d97706' }}>⏳ Pending — branch will assign a locker shortly.</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <ul className="showcase-features">
                <li>Small — ₹1,500/year · documents, jewellery up to 500g</li>
                <li>Medium — ₹2,500/year · jewellery, bonds, certificates</li>
                <li>Large — ₹4,000/year · bulk valuables, heirlooms</li>
                <li>Annual rent auto-debited from savings account</li>
                <li>Access during branch working hours</li>
                <li>Subject to availability at chosen branch</li>
              </ul>
            </div>
          </SectionCard>
        </div>
      )}
      {dlConfirm && (
        <div className="modal-overlay" onClick={() => setDlConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Download file</h3>
            <p>This will download <strong>{dlConfirm.label}</strong> to your device.</p>
            <div className="modal-actions">
              <button className="button button--ghost" onClick={() => setDlConfirm(null)}>Cancel</button>
              <button className="button button--primary" onClick={() => { dlConfirm.fn(); setDlConfirm(null); }}>📥 Download</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
