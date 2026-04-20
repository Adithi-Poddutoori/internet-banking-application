import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../utils/activityLog';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import WorkflowModal from '../components/WorkflowModal';
import ApplicationFormModal from '../components/ApplicationFormModal';
import { removeProductHistory } from '../utils/products';
import api from '../services/api';
import { downloadFile, openAsPdf } from '../utils/formatters';

function fmtINR(n) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }
function fmtINR0(n) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function seed(s) { let h = 0; for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0; return Math.abs(h); }

const PREPAY_KEY = 'nova_loan_prepayments';
function addBusinessDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  let added = 0;
  while (added < days) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) added++; }
  return d.toISOString().slice(0, 10);
}

const LOANS = [
  { icon: '', title: 'Home Loan', rate: '8.50%', tenure: 'Up to 30 years', amount: '₹50L – ₹5 Cr', features: ['Low EMI options', 'No prepayment charges', 'Quick disbursement'] },
  { icon: '', title: 'Car Loan', rate: '9.25%', tenure: 'Up to 7 years', amount: '₹1L – ₹1 Cr', features: ['100% on-road funding', 'Flexible tenure', 'Doorstep service'] },
  { icon: '', title: 'Personal Loan', rate: '10.50%', tenure: 'Up to 5 years', amount: '₹50K – ₹40L', features: ['No collateral required', 'Minimal documentation', 'Instant approval'] },
  { icon: '', title: 'Education Loan', rate: '7.50%', tenure: 'Up to 15 years', amount: '₹4L – ₹1.5 Cr', features: ['Covers tuition + living expenses', 'Moratorium during study', 'Tax benefits under 80E'] },
  { icon: '', title: 'Business Loan', rate: '11.00%', tenure: 'Up to 5 years', amount: '₹10L – ₹5 Cr', features: ['Working capital support', 'Collateral-free up to ₹50L', 'Overdraft facility'] },
  { icon: '', title: 'Gold Loan', rate: '7.00%', tenure: 'Up to 3 years', amount: '₹10K – ₹1 Cr', features: ['Instant disbursal', 'Minimal documentation', 'Safe gold custody'] },
];

export default function LoansPage() {
  const { user } = useAuth();
  const [toast, setToast] = useState({ message: '', type: '' });
  const [, refresh] = useState(0);
  const [workflow, setWorkflow] = useState(null);
  const [appForm, setAppForm] = useState(null); // { product } for ApplicationFormModal
  const [tab, setTab] = useState('products');
  const [dlConfirm, setDlConfirm] = useState(null);
  // EMI calculator
  const [emiPrincipal, setEmiPrincipal] = useState('');
  const [emiRate, setEmiRate] = useState('');
  const [emiTenure, setEmiTenure] = useState('');
  // Prepayment
  const [prepayAmt, setPrepayAmt] = useState('');
  const [prepayLoan, setPrepayLoan] = useState('');
  const [prepayConfirm, setPrepayConfirm] = useState(false);
  const [prepayments, setPrepayments] = useState([]);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    api.get('/loan-prepayments/my').then(r => setPrepayments(r.data?.data || [])).catch(() => {});
    api.get('/customers/dashboard').then(r => setAccounts(r.data?.data?.accounts || [])).catch(() => {});
  }, []);
  // Foreclosure
  const [forecloseLoan, setForecloseLoan] = useState('');
  const [foreclosureQuote, setForeclosureQuote] = useState(null);

  // Backend block state — fetched once on mount
  const [backendBlocks, setBackendBlocks] = useState([]);
  useEffect(() => {
    api.get('/product-requests/my')
      .then(r => setBackendBlocks(r.data?.data || r.data || []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    const sync = () => api.get('/product-requests/my')
      .then(r => setBackendBlocks(r.data?.data || r.data || [])).catch(() => {});
    window.addEventListener('focus', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('focus', sync); window.removeEventListener('storage', sync); };
  }, []);

  const loanRequests = backendBlocks.filter(b => b.category === 'loans');
  const myLoans = loanRequests.filter(b => b.status === 'PENDING');
  const loanHistory = loanRequests
    .filter(b => b.status === 'APPROVED' || b.status === 'DECLINED')
    .map(b => ({ title: b.productTitle, category: 'loans', decision: b.status, decidedOn: b.decidedOn, customerName: b.customerName, formData: b.formData || null }));
  const approvedLoans = loanHistory.filter(h => h.decision === 'APPROVED');

  const getAdminProductBlock = (title) => {
    const remote = backendBlocks.find(b => b.category === 'loans' && b.productTitle === title && b.status === 'APPROVED');
    return { adminBlocked: remote?.blocked === true, adminSuspended: false };
  };

  const confirmApply = (loan, formData) => {
    setBackendBlocks(prev => [...prev, { category: 'loans', productTitle: loan.title, status: 'PENDING', appliedOn: new Date().toISOString(), decidedOn: null, customerName: user?.customerName || user?.username || '' }]);
    api.post('/product-requests', { category: 'loans', productTitle: loan.title, formData: formData ? JSON.stringify(formData) : null })
      .then(() => {
        api.get('/product-requests/my')
          .then(r => setBackendBlocks(r.data?.data || r.data || []))
          .catch(() => {});
      })
      .catch(() => {
        setBackendBlocks(prev => prev.filter(b => !(b.category === 'loans' && b.productTitle === loan.title && b.status === 'PENDING')));
      });
    removeProductHistory('loans', loan.title);
    logActivity(user?.username, 'LOAN_APPLIED', { loan: loan.title });
    setToast({ message: `Your "${loan.title}" application has been submitted and is pending admin approval.`, type: 'success' });
    setWorkflow(null);
    setTab('myloans');
    refresh(n => n + 1);
  };

  const getLoanStatus = (title) => {
    const remote = loanRequests.find(b => b.productTitle === title);
    return remote ? remote.status : null;
  };

  // EMI calculation
  const emiResult = useMemo(() => {
    const P = parseFloat(emiPrincipal);
    const r = parseFloat(emiRate) / 12 / 100;
    const n = parseFloat(emiTenure) * 12;
    if (!P || !r || !n) return null;
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return { emi, total: emi * n, interest: emi * n - P };
  }, [emiPrincipal, emiRate, emiTenure]);

  const submitPrepayment = () => {
    if (!prepayLoan) return setToast({ message: 'Select a loan.', type: 'error' });
    if (!prepayAmt || Number(prepayAmt) <= 0) return setToast({ message: 'Enter a valid prepayment amount.', type: 'error' });
    setPrepayConfirm(true);
  };

  const confirmPrepayment = () => {
    const acc = accounts?.[0]?.accountNumber || '';
    const todayStr = new Date().toISOString().slice(0, 10);
    const reflectsAt = addBusinessDays(todayStr, 2);
    api.post('/loan-prepayments', { loanTitle: prepayLoan, loanRef: '', amount: Number(prepayAmt), accountNumber: acc })
      .then(r => {
        setPrepayments(prev => [r.data.data, ...prev]);
        setToast({ message: `Prepayment of ₹${Number(prepayAmt).toLocaleString('en-IN')} for "${prepayLoan}" submitted. Balance will reflect by ${new Date(reflectsAt + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`, type: 'success' });
      }).catch(e => setToast({ message: e.response?.data?.message || 'Prepayment submission failed.', type: 'error' }));
    setPrepayConfirm(false);
    setPrepayAmt('');
    refresh(n => n + 1);
  };

  const getForeclosureQuote = () => {
    if (!forecloseLoan) return setToast({ message: 'Select a loan.', type: 'error' });
    const base = 250000 + Math.floor(Math.random() * 500000);
    const penalty = Math.round(base * 0.02);
    setForeclosureQuote({ loan: forecloseLoan, outstanding: base, penalty, total: base + penalty });
  };

  return (
    <AppShell role="CUSTOMER" title="Loans" subtitle="Explore our range of loan products with competitive interest rates.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      <WorkflowModal {...(workflow || {})} open={!!workflow} onClose={() => setWorkflow(null)} />
      <ApplicationFormModal
        open={!!appForm}
        onClose={() => setAppForm(null)}
        category="loans"
        productTitle={appForm?.product?.title || ''}
        productIcon={appForm?.product?.icon || ''}
        productSubtitle={appForm ? `From ${appForm.product.rate} | ${appForm.product.tenure}` : ''}
        onSubmit={(formData) => {
          const p = appForm.product;
          setAppForm(null);
          try { localStorage.setItem(`nova_app_loans_${p.title}`, JSON.stringify({ ...formData, appliedOn: new Date().toISOString() })); } catch {}
          setWorkflow({ icon: p.icon, title: `Apply for ${p.title}`, subtitle: `Rate from ${p.rate} | ${p.tenure}`, details: [['Requested Amount', `₹${Number(formData.loanAmount || 0).toLocaleString('en-IN')}`], ['Purpose', formData.loanPurpose || '—'], ['Income', `₹${Number(formData.monthlyIncome || 0).toLocaleString('en-IN')}/mo`], ['Tenure', `${formData.tenure || '—'} yrs`]], steps: ['Application submitted', 'Admin reviews your request', 'Document verification (1–2 days)', 'Credit assessment', 'Loan disbursement'], confirmLabel: 'Confirm Application', onConfirm: () => confirmApply(p, formData) });
        }}
      />

      <div className="showcase-hero showcase-hero--loans">
        <div className="showcase-hero__stat">
          <span className="showcase-hero__label">Starting from</span>
          <span className="showcase-hero__value">7.00% p.a.</span>
        </div>
        <div className="showcase-hero__stat">
          <span className="showcase-hero__label">Quick approval</span>
          <span className="showcase-hero__value">30 min</span>
        </div>
        <div className="showcase-hero__stat">
          <span className="showcase-hero__label">My loans</span>
          <span className="showcase-hero__value">{myLoans.length + approvedLoans.length}</span>
        </div>
      </div>

      {(myLoans.length > 0 || loanHistory.length > 0) && (
        <SectionCard title="My loan applications" subtitle={`${myLoans.length + loanHistory.length} application(s) on record.`}>
          <div className="my-products-strip">
            {myLoans.map((p, i) => (
              <span key={i} className="my-product-chip">📄 {p.title} — <em>Pending admin approval</em></span>
            ))}
            {loanHistory.map((h, i) => {
              const blk = getAdminProductBlock(h.title);
              const isBlocked = h.decision === 'APPROVED' && !!blk.adminBlocked;
              const chipClass = isBlocked ? 'declined' : h.decision === 'APPROVED' ? 'approved' : 'declined';
              const icon = isBlocked ? '🚫' : h.decision === 'APPROVED' ? '✅' : '❌';
              const label = isBlocked ? 'Blocked by bank' : h.decision === 'APPROVED' ? 'Approved successfully' : 'Declined';
              return (
                <span key={`h-${i}`} className={`my-product-chip my-product-chip--${chipClass}`}>
                  {icon} {h.title} — <em>{label}</em>
                </span>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: '1.25rem' }}>
        <button className={`tab-bar__tab${tab === 'products' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('products')}>Loan Products</button>
        <button className={`tab-bar__tab${tab === 'myloans' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('myloans')}>My Loans</button>
        <button className={`tab-bar__tab${tab === 'emi' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('emi')}>EMI Calculator</button>
        <button className={`tab-bar__tab${tab === 'manage' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('manage')}>Manage</button>
      </div>

      {tab === 'myloans' && (
        <>
          {myLoans.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.25rem' }}>
              {myLoans.map((req, idx) => {
                const loanDef = LOANS.find(l => l.title === req.productTitle) || {};
                return (
                  <SectionCard key={`pending-${idx}`} title={`${loanDef.icon || ''} ${req.productTitle}`} subtitle="Pending admin approval">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '10px', background: '#fefce8', border: '1.5px solid #fcd34d' }}>
                      <span style={{ fontSize: '1.5rem' }}>⏳</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#92400e' }}>Application under review</div>
                        <div style={{ fontSize: '0.82rem', color: '#a16207', marginTop: '0.2rem' }}>Your loan application has been submitted and is pending admin approval. EMI details will appear here once approved.</div>
                      </div>
                    </div>
                    {loanDef.rate && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
                        <span>Rate: <strong>{loanDef.rate}</strong></span>
                        <span>Tenure: <strong>{loanDef.tenure}</strong></span>
                        <span>Amount: <strong>{loanDef.amount}</strong></span>
                      </div>
                    )}
                  </SectionCard>
                );
              })}
            </div>
          )}
          {approvedLoans.length === 0 && myLoans.length === 0 ? (
            <SectionCard title="No active loans" subtitle="Apply for a loan from the Products tab. Once approved by admin, your loan details will appear here.">
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>Your active loan details — EMI schedule, outstanding balance, and repayment progress — will be visible here after admin approves your application.</p>
            </SectionCard>
          ) : approvedLoans.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {approvedLoans.map((loan, idx) => {
                const loanDef = LOANS.find(l => l.title === loan.title) || {};
                const blk = getAdminProductBlock(loan.title);
                const isBlocked = !!blk.adminBlocked;
                const isSuspended = !!blk.adminSuspended;
                const s = seed(loan.title);
                const parsedForm = (() => { try { return loan.formData ? JSON.parse(loan.formData) : null; } catch { return null; } })();
                const principal = Number(parsedForm?.loanAmount) || (s % 20 + 5) * 100000;
                const rateAnnual = parseFloat(loanDef.rate) || 10;
                const r = rateAnnual / 12 / 100;
                const tenureYears = Number(parsedForm?.tenure) || (s % 5) + 5;
                const n = tenureYears * 12;
                const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
                const startDate = new Date(loan.decidedOn);
                const now = new Date();
                const monthsElapsed = Math.max(0, Math.floor((now - startDate) / (1000 * 60 * 60 * 24 * 30.44)));
                const paid = Math.min(monthsElapsed, n);
                const outstanding = principal * (Math.pow(1 + r, n) - Math.pow(1 + r, paid)) / (Math.pow(1 + r, n) - 1);
                const nextEmi = new Date(startDate);
                nextEmi.setMonth(nextEmi.getMonth() + paid + 1);
                const acctNo = `LN-${(s % 900000 + 100000)}`;
                const pct = Math.min(Math.round(paid / n * 100), 100);

                // Prepayment adjustments
                const todayStr = new Date().toISOString().slice(0, 10);
                const loanPrepayments = prepayments.filter(p => p.loanTitle === loan.title);
                const appliedPrepayAmt = loanPrepayments.filter(p => p.status !== 'PENDING').reduce((s, p) => s + Number(p.amount), 0);
                const pendingPrepayments = loanPrepayments.filter(p => p.status === 'PENDING');
                const adjustedOutstanding = Math.max(0, outstanding - appliedPrepayAmt);

                const genRepaySchedule = () => {
                  const rows = ['Month No.,Due Date,Opening Balance (INR),EMI (INR),Principal (INR),Interest (INR),Closing Balance (INR)'];
                  let bal = principal;
                  for (let m = 1; m <= Math.min(n, 24); m++) {
                    const int = bal * r;
                    const prin = emi - int;
                    const due = new Date(startDate); due.setMonth(due.getMonth() + m);
                    rows.push(`${m},${due.toLocaleDateString('en-IN')},${bal.toFixed(2)},${emi.toFixed(2)},${prin.toFixed(2)},${int.toFixed(2)},${Math.max(0, bal - prin).toFixed(2)}`);
                    bal = Math.max(0, bal - prin);
                    if (bal < 1) break;
                  }
                  downloadFile(`repayment_schedule_${acctNo}.csv`, '\uFEFF' + rows.join('\n'), 'text/csv;charset=utf-8');
                  setToast({ message: 'Repayment Schedule downloaded.', type: 'success' });
                };

                const genStatement = () => {
                  const rows = ['Date,Description,Debit (INR),Credit (INR),Balance (INR)'];
                  rows.push(`${startDate.toLocaleDateString('en-IN')},Loan Disbursed,,${principal.toFixed(2)},${principal.toFixed(2)}`);
                  let bal = principal;
                  for (let m = 1; m <= paid; m++) {
                    const int = bal * r; const prin = emi - int;
                    const due = new Date(startDate); due.setMonth(due.getMonth() + m);
                    rows.push(`${due.toLocaleDateString('en-IN')},EMI #${m} Debit,${emi.toFixed(2)},,${Math.max(0, bal - prin).toFixed(2)}`);
                    bal = Math.max(0, bal - prin);
                  }
                  downloadFile(`loan_statement_${acctNo}.csv`, '\uFEFF' + rows.join('\n'), 'text/csv;charset=utf-8');
                  setToast({ message: 'Loan Statement downloaded.', type: 'success' });
                };

                const genInterestCert = () => {
                  let totalInt = 0; let bal = principal;
                  const fy = new Date('2025-04-01'); const fyEnd = new Date('2026-03-31');
                  for (let m = 1; m <= n; m++) {
                    const int = bal * r; const prin = emi - int;
                    const due = new Date(startDate); due.setMonth(due.getMonth() + m);
                    if (due >= fy && due <= fyEnd) totalInt += int;
                    bal = Math.max(0, bal - prin); if (bal < 1) break;
                  }
                  const text = `NOVA BANK\nINTEREST CERTIFICATE — FY 2025-26\n${'='.repeat(40)}\nLoan Account : ${acctNo}\nLoan Type    : ${loan.title}\nCustomer     : ${loan.customerName || 'Customer'}\nPrincipal    : ${fmtINR0(principal)}\nRate         : ${rateAnnual}% p.a.\nInterest paid (FY 2025-26): ${fmtINR0(totalInt)}\n\nThis certificate is generated for income tax filing purposes.\nFor queries, contact your nearest Nova Bank branch.`;
                  openAsPdf('Interest Certificate — FY 2025-26', text);
                  setToast({ message: 'Interest Certificate opened for PDF download.', type: 'success' });
                };

                const genSanctionLetter = () => {
                  const text = `NOVA BANK\nLOAN SANCTION LETTER\n${'='.repeat(40)}\nDate         : ${startDate.toLocaleDateString('en-IN')}\nLoan Account : ${acctNo}\nCustomer     : ${loan.customerName || 'Customer'}\nLoan Type    : ${loan.title}\nAmount       : ${fmtINR0(principal)}\nRate         : ${rateAnnual}% p.a. (floating)\nTenure       : ${tenureYears} years (${n} EMIs)\nMonthly EMI  : ${fmtINR0(Math.round(emi))}\nFirst EMI    : ${new Date(startDate.getTime() + 30 * 24 * 3600 * 1000).toLocaleDateString('en-IN')}\n\nThis letter constitutes the official sanction of the above loan.\nSubject to terms and conditions.\n\nNova Bank Ltd.`;
                  openAsPdf('Loan Sanction Letter', text);
                  setToast({ message: 'Sanction Letter opened for PDF download.', type: 'success' });
                };

                return (
                  <SectionCard key={idx} title={`${loanDef.icon || ''} ${loan.title}`} subtitle={`Account: ${acctNo}  •  Status: ${isBlocked ? '🚫 Blocked'  : 'Active'}  •  Since: ${startDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}>
                    {(isBlocked) && (
                      <div style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', background: isBlocked ? '#faf5ff' : '#fff7ed', border: `1.5px solid ${isBlocked ? '#c4b5fd' : '#fdba74'}`, fontSize: '0.85rem', fontWeight: 600, color: isBlocked ? '#7c3aed' : '#c2410c', marginBottom: '1rem' }}>
                        {isBlocked ? '🚫 This loan has been blocked by the bank. EMI processing and disbursements are currently on hold. Contact support.' : '🔒 This loan has been temporarily suspended by the bank. Contact support for details.'}
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.625rem', marginBottom: '1rem' }}>
                      {[['Principal', fmtINR0(principal)], ['Interest Rate', `${rateAnnual}% p.a.`], ['Tenure', `${tenureYears} yrs (${n} EMIs)`], ['Monthly EMI', fmtINR0(Math.round(emi))], ['EMIs Paid', `${paid} / ${n}`], ['Outstanding', fmtINR0(adjustedOutstanding)]].map(([k, v]) => (
                        <div key={k} style={{ padding: '0.625rem', borderRadius: '8px', background: 'var(--panel-soft)', border: '1px solid var(--line)' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{k}</div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                        <span>Repayment progress</span><span style={{ fontWeight: 700, color: 'var(--primary)' }}>{pct}%</span>
                      </div>
                      <div style={{ height: '10px', borderRadius: '5px', background: 'var(--line)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#2563eb,#16a34a)', borderRadius: '5px', transition: 'width 0.4s' }} />
                      </div>
                    </div>
                    {pendingPrepayments.length > 0 && pendingPrepayments.map(pp => (
                      <div key={pp.id} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fcd34d', fontSize: '0.8rem', color: '#d97706', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>⏳ Prepayment of <strong>{fmtINR0(pp.amount)}</strong> pending approval</span>
                        <span style={{ fontWeight: 600 }}>{pp.ref || pp.id}</span>
                      </div>
                    ))}
                    {appliedPrepayAmt > 0 && (
                      <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #86efac', fontSize: '0.8rem', color: '#16a34a', marginBottom: '0.5rem' }}>
                        ✅ {fmtINR0(appliedPrepayAmt)} in prepayments applied to your outstanding balance.
                      </div>
                    )}
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                      Next EMI: <strong style={{ color: 'var(--primary)' }}>{nextEmi.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <button className="button button--sm button--ghost" onClick={() => setDlConfirm({ label: 'Repayment Schedule', fn: genRepaySchedule })}>📄 Repayment Schedule</button>
                      <button className="button button--sm button--ghost" onClick={() => setDlConfirm({ label: 'Loan Statement', fn: genStatement })}>📊 Loan Statement</button>
                      <button className="button button--sm button--ghost" onClick={() => setDlConfirm({ label: 'Interest Certificate', fn: genInterestCert })}>🧾 Interest Certificate</button>
                      <button className="button button--sm button--ghost" onClick={() => setDlConfirm({ label: 'Sanction Letter', fn: genSanctionLetter })}>📋 Sanction Letter</button>
                    </div>
                  </SectionCard>
                );
              })}
            </div>
          ) : null}
        </>
      )}

      {tab === 'products' && (
        <div className="showcase-grid">
          {LOANS.map((loan, i) => {
            const status = getLoanStatus(loan.title);
            const blk = getAdminProductBlock(loan.title);
            const isBlocked = status === 'APPROVED' && !!blk.adminBlocked;
            const isSuspended = status === 'APPROVED' && !isBlocked && !!blk.adminSuspended;
            return (
              <SectionCard key={i} title={`${loan.icon} ${loan.title}`} subtitle={`Interest rate from ${loan.rate}`}>
                <div className="showcase-meta">
                  <span>Amount: {loan.amount}</span>
                  <span>Tenure: {loan.tenure}</span>
                </div>
                <ul className="showcase-features">
                  {loan.features.map((f, j) => <li key={j}>{f}</li>)}
                </ul>
                {isBlocked && <span className="badge badge--error">🚫 Blocked by Bank</span>}
                {!isBlocked && status === 'APPROVED' && <span className="badge badge--success">✅ Approved</span>}
                {status === 'DECLINED' && <span className="badge badge--error">❌ Declined</span>}
                {status === 'PENDING' && <span className="badge badge--warning">⏳ Pending Approval</span>}
                {(!status || status === 'DECLINED') && !isBlocked && !isSuspended && (
                  <button className="button button--sm button--primary" onClick={() => setAppForm({ product: loan })}>{status === 'DECLINED' ? 'Re-apply' : 'Apply Now'}</button>
                )}
                {(isBlocked || isSuspended) && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.5rem 0 0' }}>{isBlocked ? 'This loan product has been blocked by the bank. Please contact support.' : 'This loan is temporarily suspended. Please try again later.'}</p>
                )}
              </SectionCard>
            );
          })}
        </div>
      )}

      {tab === 'emi' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          <SectionCard title="EMI Calculator" subtitle="Calculate your monthly EMI before applying.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {[
                ['Loan amount (₹)', emiPrincipal, setEmiPrincipal, 'e.g. 500000', 10, true],
                ['Annual interest rate (%)', emiRate, setEmiRate, 'e.g. 8.5', 5, false],
                ['Tenure (years)', emiTenure, setEmiTenure, 'e.g. 5', 2, true],
              ].map(([label, val, setter, ph, maxLen, digitsOnly]) => (
                <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{label}</span>
                  <input type="text" inputMode="numeric" min="0" maxLength={maxLen} placeholder={ph} value={val}
                    onChange={e => setter(digitsOnly ? e.target.value.replace(/\D/g, '') : e.target.value.replace(/[^0-9.]/g, ''))}
                    style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.95rem' }} />
                </label>
              ))}
              {emiResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.875rem', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #86efac', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Monthly EMI</span><strong style={{ color: '#16a34a', fontSize: '1.1rem' }}>{fmtINR(emiResult.emi)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Total interest</span><span>{fmtINR(emiResult.interest)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Total payment</span><span>{fmtINR(emiResult.total)}</span></div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Loan tips" subtitle="Make the most of your loan.">
            <ul className="showcase-features">
              <li>A higher credit score (750+) gets you better rates</li>
              <li>Shorter tenure = less interest but higher EMI</li>
              <li>Prepaying reduces outstanding principal faster</li>
              <li>Compare total cost of loan, not just rate</li>
              <li>Tax benefit on home loan interest u/s 24(b)</li>
              <li>Education loan interest deductible u/s 80E</li>
            </ul>
          </SectionCard>
        </div>
      )}

      {tab === 'manage' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {/* Prepayment */}
          <SectionCard title="Prepayment" subtitle="Pay extra towards principal to reduce interest burden.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Select loan</span>
                <select value={prepayLoan} onChange={e => setPrepayLoan(e.target.value)}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--panel)', fontSize: '0.9rem' }}>
                  <option value="">— Select —</option>
                  {approvedLoans.map((l, i) => <option key={i} value={l.title}>{l.title}</option>)}
                  {approvedLoans.length === 0 && <option disabled>No approved loans yet</option>}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Prepayment amount (₹)</span>
                <input type="text" inputMode="numeric" maxLength={10} min="0" placeholder="e.g. 50000" value={prepayAmt} onChange={e => setPrepayAmt(e.target.value.replace(/\D/g, ''))}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.95rem' }} />
              </label>
              <button className="button button--primary" onClick={submitPrepayment}>Submit Prepayment</button>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0 }}>No prepayment charges for home and education loans. 2% penalty applies on personal and car loans.</p>
            </div>
          </SectionCard>

          <SectionCard title="Documents" subtitle="Open the My Loans tab to download per-loan statements, repayment schedules, and certificates.">
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>Switch to the <strong>My Loans</strong> tab → select your active loan → use the download buttons at the bottom of each loan card to get PDFs and CSVs directly on your device.</p>
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

      {/* Prepayment confirm bar */}
      {prepayConfirm && (
        <div className="confirm-bar-overlay" onClick={() => setPrepayConfirm(false)}>
          <div className="confirm-bar" onClick={e => e.stopPropagation()}>
            <div className="confirm-bar__icon">⚠️</div>
            <div className="confirm-bar__title">Confirm Prepayment</div>
            <div className="confirm-bar__desc">
              You are about to make a prepayment towards your loan. This action will reduce your outstanding principal and revise your EMI schedule. Please verify the details below before proceeding.
            </div>
            <div className="confirm-bar__details">
              <div className="confirm-bar__detail-row">
                <span className="confirm-bar__detail-label">Loan account</span>
                <span className="confirm-bar__detail-val">{prepayLoan}</span>
              </div>
              <div className="confirm-bar__detail-row">
                <span className="confirm-bar__detail-label">Prepayment amount</span>
                <span className="confirm-bar__detail-val">{fmtINR(prepayAmt)}</span>
              </div>
              <div className="confirm-bar__detail-row">
                <span className="confirm-bar__detail-label">Processing time</span>
                <span className="confirm-bar__detail-val">2 working days</span>
              </div>
            </div>
            <div className="confirm-bar__warning">
              ⚠️ <span>A <strong>2% prepayment penalty</strong> applies on Personal and Car loans. Home, Education, and Gold loans have no prepayment charges. This payment cannot be reversed once processed.</span>
            </div>
            <div className="confirm-bar__actions">
              <button className="button button--ghost" onClick={() => setPrepayConfirm(false)} style={{ background: 'var(--panel-soft)', border: '1px solid var(--line)' }}>Cancel</button>
              <button className="button button--primary" onClick={confirmPrepayment}>✅ Confirm Prepayment</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
