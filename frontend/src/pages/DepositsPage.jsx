import { useState, useMemo, useEffect } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import WorkflowModal from '../components/WorkflowModal';
import ApplicationFormModal from '../components/ApplicationFormModal';
import api from '../services/api';
import { downloadFile, openAsPdf } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

function fmtINR(n) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }
function fmtINR0(n) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function seed(s) { let h = 0; for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0; return Math.abs(h); }

const DEPOSITS = [
  { icon: '', title: 'Fixed Deposit (FD)', rate: '7.10%', tenure: '7 days – 10 years', minAmount: '₹1,000', features: ['Guaranteed returns', 'Premature withdrawal option', 'Loan against FD available'] },
  { icon: '', title: 'Recurring Deposit (RD)', rate: '6.80%', tenure: '6 months – 10 years', minAmount: '₹100/month', features: ['Monthly saving habit', 'Flexible tenure', 'Auto-debit from savings'] },
  { icon: '', title: 'Flexi Deposit', rate: '6.50%', tenure: '1 – 5 years', minAmount: '₹25,000', features: ['Sweep-in/sweep-out', 'Higher returns than savings', 'Liquidity preserved'] },
  { icon: '', title: 'Annuity Deposit', rate: '7.25%', tenure: '3 – 10 years', minAmount: '₹10,000', features: ['Monthly interest payout', 'Ideal for retirees', 'Steady income stream'] },
  { icon: '', title: 'Senior Citizen FD', rate: '7.60%', tenure: '1 – 10 years', minAmount: '₹1,000', features: ['Extra 0.50% interest', 'Quarterly interest payout', 'Tax-saver option available'] },
  { icon: '', title: 'NRE/NRO Deposit', rate: '6.50%', tenure: '1 – 10 years', minAmount: '₹10,000', features: ['Repatriable returns (NRE)', 'Competitive rates', 'Dual currency options'] },
];

export default function DepositsPage() {
  const { user } = useAuth();
  const [toast, setToast] = useState({ message: '', type: '' });
  const [, refresh] = useState(0);
  const [workflow, setWorkflow] = useState(null);
  const [appForm, setAppForm] = useState(null);
  const [tab, setTab] = useState('products');
  const [dlConfirm, setDlConfirm] = useState(null);
  // Calculator state
  const [calcPrincipal, setCalcPrincipal] = useState('');
  const [calcRate, setCalcRate] = useState('');
  const [calcTenure, setCalcTenure] = useState('');
  const [calcType, setCalcType] = useState('FD');
  const [calcFreq, setCalcFreq] = useState('quarterly');
  // Manage state
  const [withdrawDep, setWithdrawDep] = useState('');
  const [withdrawals, setWithdrawals] = useState([]);
  const [autoRenewals, setAutoRenewals] = useState({});

  // Backend block state — fetched once on mount
  const [backendBlocks, setBackendBlocks] = useState([]);

  const depRequests = backendBlocks.filter(b => b.category === 'deposits');
  const myDep = depRequests.filter(b => b.status === 'PENDING');
  const depHistory = depRequests
    .filter(b => b.status === 'APPROVED' || b.status === 'DECLINED')
    .map(b => ({ title: b.productTitle, decision: b.status, decidedOn: b.decidedOn, customerName: b.customerName, formData: b.formData || null }));
  const activeDeps = depHistory.filter(h => h.decision === 'APPROVED');
  useEffect(() => {
    api.get('/product-requests/my')
      .then(r => setBackendBlocks(r.data?.data || r.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/fd-withdrawals/my').then(r => setWithdrawals(r.data?.data || [])).catch(() => {});
  }, []);

  // Re-render when window gains focus so admin block changes are reflected immediately
  const [, refreshAdminState] = useState(0);
  useEffect(() => {
    const sync = () => {
      refreshAdminState(n => n + 1);
      api.get('/product-requests/my')
        .then(r => setBackendBlocks(r.data?.data || r.data || []))
        .catch(() => {});
    };
    window.addEventListener('focus', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('focus', sync); window.removeEventListener('storage', sync); };
  }, []);

  const getAdminProductBlock = (title) => {
    const remote = backendBlocks.find(b => b.category === 'deposits' && b.productTitle === title && b.status === 'APPROVED');
    return { adminBlocked: remote?.blocked === true };
  };

  const getDepStatus = (title) => {
    const remote = depRequests.find(b => b.productTitle === title);
    return remote ? remote.status : null;
  };

  const getDepActiveCount = (title) => depRequests.filter(b => b.productTitle === title && b.status === 'APPROVED').length;

  const confirmOpen = (dep, formData) => {
    setBackendBlocks(prev => [...prev, { category: 'deposits', productTitle: dep.title, status: 'PENDING', appliedOn: new Date().toISOString(), decidedOn: null, customerName: user?.customerName || user?.username || '' }]);
    api.post('/product-requests', { category: 'deposits', productTitle: dep.title, formData: formData ? JSON.stringify(formData) : null })
      .then(() => {
        api.get('/product-requests/my')
          .then(r => setBackendBlocks(r.data?.data || r.data || []))
          .catch(() => {});
      })
      .catch(() => {
        setBackendBlocks(prev => prev.filter(b => !(b.category === 'deposits' && b.productTitle === dep.title && b.status === 'PENDING')));
      });
    setToast({ message: `"${dep.title}" opened at ${dep.rate} p.a.! You can track it in your account portfolio.`, type: 'success' });
    setWorkflow(null);
    setTab('mydeposits');
    refresh(n => n + 1);
  };

  // Maturity calculator
  const calcResult = useMemo(() => {
    const P = parseFloat(calcPrincipal);
    const r = parseFloat(calcRate) / 100;
    const t = parseFloat(calcTenure);
    if (!P || !r || !t) return null;
    const freqMap = { monthly: 12, quarterly: 4, halfyearly: 2, yearly: 1 };
    const n = freqMap[calcFreq] || 4;
    if (calcType === 'RD') {
      // RD maturity: M = R * [(1+r/n)^(nt) - 1] / (1-(1+r/n)^(-1/3))
      const rate_per = r / n;
      let maturity = 0;
      const months = Math.round(t * 12);
      for (let i = 1; i <= months; i++) {
        maturity += P * Math.pow(1 + r / 12, i);
      }
      return { maturity, interest: maturity - P * months, invested: P * months };
    }
    const maturity = P * Math.pow(1 + r / n, n * t);
    return { maturity, interest: maturity - P, invested: P };
  }, [calcPrincipal, calcRate, calcTenure, calcType, calcFreq]);

  const toggleAutoRenew = (title) => {
    setAutoRenewals(prev => {
      const next = { ...prev, [title]: !prev[title] };
      setToast({ message: `Auto-renewal ${next[title] ? 'enabled' : 'disabled'} for "${title}".`, type: 'info' });
      return next;
    });
  };

  const submitWithdrawal = () => {
    if (!withdrawDep) return setToast({ message: 'Select a deposit to withdraw.', type: 'error' });
    const acc = '';
    api.post('/fd-withdrawals', { depositTitle: withdrawDep, depositRef: '', amount: 0, accountNumber: acc })
      .then(r => {
        setWithdrawals(prev => [r.data.data, ...prev]);
        setToast({ message: `Premature withdrawal request for "${withdrawDep}" submitted. Funds credited after penalty deduction within 1 working day.`, type: 'success' });
      }).catch(e => setToast({ message: e.response?.data?.message || 'Withdrawal submission failed.', type: 'error' }));
    setWithdrawDep('');
  };

  return (
    <AppShell role="CUSTOMER" title="Deposits" subtitle="Park your money safely and earn guaranteed returns.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      <WorkflowModal {...(workflow || {})} open={!!workflow} onClose={() => setWorkflow(null)} />
      <ApplicationFormModal
        open={!!appForm}
        onClose={() => setAppForm(null)}
        category="deposits"
        productTitle={appForm?.dep?.title || ''}
        productIcon={appForm?.dep?.icon || ''}
        productSubtitle={appForm ? `Rate: ${appForm.dep.rate} | Tenure: ${appForm.dep.tenure}` : ''}
        onSubmit={(formData) => {
          const p = appForm.dep;
          setAppForm(null);
          try { localStorage.setItem(`nova_app_deposits_${p.title}`, JSON.stringify({ ...formData, appliedOn: new Date().toISOString() })); } catch {}
          setWorkflow({ icon: p.icon, title: `Open ${p.title}`, subtitle: `Rate: ${p.rate} | Tenure: ${p.tenure}`, details: [['Amount', `₹${Number(formData.amount || 0).toLocaleString('en-IN')}`], ['Tenure', `${formData.tenure || '—'} months`], ['Payout', formData.payoutFrequency || '—'], ['Nominee', formData.nominationName || '—']], steps: ['Application submitted', 'Amount debited from savings', 'Deposit certificate generated', 'Interest credited as per schedule'], confirmLabel: 'Open Deposit', onConfirm: () => confirmOpen(p, formData) });
        }}
      />

      <div className="showcase-hero showcase-hero--deposits">
        <div className="showcase-hero__stat"><span className="showcase-hero__label">Best FD rate</span><span className="showcase-hero__value">7.60% p.a.</span></div>
        <div className="showcase-hero__stat"><span className="showcase-hero__label">My deposits</span><span className="showcase-hero__value">{myDep.length + activeDeps.length}</span></div>
        <div className="showcase-hero__stat"><span className="showcase-hero__label">Products</span><span className="showcase-hero__value">{DEPOSITS.length}</span></div>
      </div>

      {(myDep.length > 0 || depHistory.length > 0) && (
        <SectionCard title="My deposits" subtitle={`${myDep.length + depHistory.length} deposit application(s) on record.`}>
          <div className="my-products-strip">
            {myDep.map((p, i) => <span key={i} className="my-product-chip">⏳ {p.productTitle} — <em>Pending admin approval</em></span>)}
            {depHistory.map((h, i) => {
              const blk = getAdminProductBlock(h.title);
              const isBlocked = h.decision === 'APPROVED' && !!blk.adminBlocked;
              const chipClass = isBlocked ? 'declined' : h.decision === 'APPROVED' ? 'approved' : 'declined';
              const icon = isBlocked ? '🚫': h.decision === 'APPROVED' ? '✅' : '❌';
              const label = isBlocked ? 'Blocked by bank'  : h.decision === 'APPROVED' ? 'Deposit active' : 'Declined';
              return (
                <span key={`h-${i}`} className={`my-product-chip my-product-chip--${chipClass}`}>
                  {icon} {h.title} — <em>{label}</em>
                </span>
              );
            })}
          </div>
        </SectionCard>
      )}

      <div className="tab-bar" style={{ marginBottom: '1.25rem' }}>
        <button className={`tab-bar__tab${tab === 'products' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('products')}>Deposit Products</button>
        <button className={`tab-bar__tab${tab === 'mydeposits' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('mydeposits')}>My Deposits</button>
        <button className={`tab-bar__tab${tab === 'calc' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('calc')}>Calculator</button>
        <button className={`tab-bar__tab${tab === 'manage' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('manage')}>Manage</button>
      </div>

      {tab === 'mydeposits' && (
        <>
          {myDep.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.25rem' }}>
              {myDep.map((req, idx) => {
                const def = DEPOSITS.find(d => d.title === req.productTitle) || {};
                return (
                  <SectionCard key={`pending-${idx}`} title={`${def.icon || '🔒'} ${req.productTitle}`} subtitle="Pending admin approval">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '10px', background: '#fefce8', border: '1.5px solid #fcd34d' }}>
                      <span style={{ fontSize: '1.5rem' }}>⏳</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#92400e' }}>Application under review</div>
                        <div style={{ fontSize: '0.82rem', color: '#a16207', marginTop: '0.2rem' }}>Your deposit application has been submitted and is pending admin approval. Account details will appear here once approved.</div>
                      </div>
                    </div>
                    {def.rate && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
                        <span>Rate: <strong>{def.rate}</strong></span>
                        <span>Tenure: <strong>{def.tenure}</strong></span>
                        <span>Min amount: <strong>{def.minAmount}</strong></span>
                      </div>
                    )}
                  </SectionCard>
                );
              })}
            </div>
          )}
          {activeDeps.length === 0 && myDep.length === 0 ? (
            <SectionCard title="No active deposits" subtitle="Open a deposit from the Products tab. Once approved, full details will appear here.">
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>Interest earned, maturity date, and account details will be shown here once your deposit is active.</p>
            </SectionCard>
          ) : activeDeps.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {activeDeps.map((dep, idx) => {
                const def = DEPOSITS.find(d => d.title === dep.title) || {};
                const blk = getAdminProductBlock(dep.title);
                const isBlocked = !!blk.adminBlocked;
                const s = seed(dep.title);
                const parsedForm = (() => { try { return dep.formData ? JSON.parse(dep.formData) : null; } catch { return null; } })();
                const isRD = dep.title.toLowerCase().includes('recurring');
                const rateAnnual = parseFloat(def.rate) || 6.8;
                const r = rateAnnual / 100;
                const tenureYears = Number(parsedForm?.tenure) || (s % 4) + 2;
                const principal = Number(parsedForm?.amount) || (isRD ? (s % 9 + 1) * 500 : (s % 10 + 1) * 10000);
                const startDate = new Date(dep.decidedOn);
                const maturityDate = new Date(startDate);
                maturityDate.setFullYear(maturityDate.getFullYear() + tenureYears);
                const now = new Date();
                const totalDays = maturityDate - startDate;
                const elapsedDays = Math.min(now - startDate, totalDays);
                const pct = Math.min(Math.round(elapsedDays / totalDays * 100), 100);

                // Maturity calculation
                let maturityAmt, totalInvested;
                if (isRD) {
                  const months = tenureYears * 12;
                  totalInvested = principal * months;
                  maturityAmt = 0;
                  for (let m = 1; m <= months; m++) maturityAmt += principal * Math.pow(1 + r / 12, m);
                } else {
                  totalInvested = principal;
                  maturityAmt = principal * Math.pow(1 + r / 4, 4 * tenureYears);
                }
                const interestEarned = maturityAmt - totalInvested;

                // Interest accrued so far
                const elapsedMonths = Math.floor(elapsedDays / (1000 * 60 * 60 * 24 * 30.44));
                let accruedSoFar = 0;
                if (isRD) {
                  for (let m = 1; m <= Math.min(elapsedMonths, tenureYears * 12); m++)
                    accruedSoFar += principal * (Math.pow(1 + r / 12, m) - 1);
                } else {
                  accruedSoFar = principal * (Math.pow(1 + r / 4, 4 * (elapsedDays / (365.25 * 1000 * 60 * 60 * 24))) - 1);
                }

                const acctNo = `DEP-${(s % 900000 + 100000)}`;
                const isMatured = now >= maturityDate;

                const genStatement = () => {
                  const rows = ['Date,Description,Debit (INR),Credit (INR),Balance (INR)'];
                  rows.push(`${startDate.toLocaleDateString('en-IN')},Deposit Opened,,${principal.toFixed(2)},${principal.toFixed(2)}`);
                  let bal = principal;
                  for (let m = 1; m <= Math.min(elapsedMonths, 24); m++) {
                    const int = bal * r / 12;
                    const d = new Date(startDate); d.setMonth(d.getMonth() + m);
                    if (isRD) rows.push(`${d.toLocaleDateString('en-IN')},RD Installment Credit,,${principal.toFixed(2)},${(bal += principal, bal.toFixed(2))}`);
                    rows.push(`${d.toLocaleDateString('en-IN')},Interest Credit,,${int.toFixed(2)},${(bal += int, bal.toFixed(2))}`);
                  }
                  downloadFile(`deposit_statement_${acctNo}.csv`, '\uFEFF' + rows.join('\n'), 'text/csv;charset=utf-8');
                  setToast({ message: 'Deposit Statement downloaded.', type: 'success' });
                };

                const genCertificate = () => {
                  const text = `NOVA BANK\nDEPOSIT CERTIFICATE\n${'='.repeat(40)}\nAccount No   : ${acctNo}\nDeposit Type : ${dep.title}\nCustomer     : ${dep.customerName || 'Customer'}\nPrincipal    : ${fmtINR0(totalInvested)}\nRate         : ${rateAnnual}% p.a.\nTenure       : ${tenureYears} years\nStart Date   : ${startDate.toLocaleDateString('en-IN')}\nMaturity Date: ${maturityDate.toLocaleDateString('en-IN')}\nMaturity Amt : ${fmtINR0(Math.round(maturityAmt))}\nTotal Interest: ${fmtINR0(Math.round(interestEarned))}\nStatus       : ${isMatured ? 'MATURED' : 'ACTIVE'}\n\nThis is an official certificate issued by Nova Bank Ltd.`;
                  openAsPdf('Deposit Certificate', text);
                  setToast({ message: 'Deposit Certificate opened for PDF download.', type: 'success' });
                };

                const genInterestCert = () => {
                  const fy_interest = totalInvested * r * 0.85;
                  const tds = fy_interest * 0.1;
                  const text = `NOVA BANK\nINTEREST CERTIFICATE — FY 2025-26\n${'='.repeat(40)}\nAccount No   : ${acctNo}\nDeposit Type : ${dep.title}\nCustomer     : ${dep.customerName || 'Customer'}\n\nInterest paid (FY 2025-26): ${fmtINR0(Math.round(fy_interest))}\nTDS Deducted (10%)        : ${fmtINR0(Math.round(tds))}\nNet Interest              : ${fmtINR0(Math.round(fy_interest - tds))}\n\nFor income tax filing under head ‘Income from Other Sources’.\nNova Bank Ltd.`;
                  openAsPdf('Interest Certificate — FY 2025-26', text);
                  setToast({ message: 'Interest Certificate opened for PDF download.', type: 'success' });
                };

                const genForm15G = () => {
                  const text = `NOVA BANK\nFORM 15G - DECLARATION UNDER SECTION 197A\n${'='.repeat(40)}\nAccount No   : ${acctNo}\nCustomer     : ${dep.customerName || 'Customer'}\n\nI hereby declare that the total income computed in accordance with the provisions of\nthe Income Tax Act, 1961 for the previous year does not exceed the maximum amount\nwhich is not chargeable to income tax.\n\nI request that no tax be deducted at source on the interest earned on the above deposit.\n\nSignature: _____________________\nDate     : ${new Date().toLocaleDateString('en-IN')}\n\n[Submit this form at your nearest Nova Bank branch]`;
                  openAsPdf('Form 15G — Declaration u/s 197A', text);
                  setToast({ message: 'Form 15G opened for PDF download.', type: 'success' });
                };

                return (
                  <SectionCard key={idx} title={`${def.icon || ''} ${dep.title}`} subtitle={`Account: ${acctNo}  •  Status: ${isBlocked ? '🚫 Blocked'  : isMatured ? '🏁 Matured' : '✅ Active'}  •  Since: ${startDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}>
                    {isBlocked && (
                      <div style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', background: '#faf5ff', border: '1.5px solid #c4b5fd', fontSize: '0.85rem', fontWeight: 600, color: '#7c3aed', marginBottom: '1rem' }}>
                        🚫 This deposit has been blocked by the bank. Withdrawals and renewals are currently unavailable. Contact support.
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.625rem', marginBottom: '1rem' }}>
                      {(isRD
                        ? [['Monthly Install.', fmtINR0(principal)], ['Interest Rate', `${rateAnnual}% p.a.`], ['Tenure', `${tenureYears} yrs`], ['Total Invested', fmtINR0(totalInvested)], ['Maturity Amount', fmtINR0(Math.round(maturityAmt))], ['Interest at Maturity', fmtINR0(Math.round(interestEarned))]]
                        : [['Principal', fmtINR0(principal)], ['Interest Rate', `${rateAnnual}% p.a.`], ['Tenure', `${tenureYears} yrs`], ['Maturity Amount', fmtINR0(Math.round(maturityAmt))], ['Interest Earned', fmtINR0(Math.round(accruedSoFar))], ['Total Interest', fmtINR0(Math.round(interestEarned))]]
                      ).map(([k, v]) => (
                        <div key={k} style={{ padding: '0.625rem', borderRadius: '8px', background: 'var(--panel-soft)', border: '1px solid var(--line)' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{k}</div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                        <span>Time elapsed</span><strong style={{ color: 'var(--primary)' }}>{pct}% • Matures: {maturityDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                      </div>
                      <div style={{ height: '10px', borderRadius: '5px', background: 'var(--line)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#2563eb,#16a34a)', borderRadius: '5px', transition: 'width 0.4s' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <button className="button button--sm button--ghost" onClick={() => setDlConfirm({ label: 'Deposit Statement', fn: genStatement })}>📊 Deposit Statement</button>
                      <button className="button button--sm button--ghost" onClick={() => setDlConfirm({ label: 'Deposit Certificate', fn: genCertificate })}>🏦 Deposit Certificate</button>
                      <button className="button button--sm button--ghost" onClick={() => setDlConfirm({ label: 'Interest Certificate', fn: genInterestCert })}>🧾 Interest Certificate</button>
                      <button className="button button--sm button--ghost" onClick={() => setDlConfirm({ label: 'Form 15G', fn: genForm15G })}>📋 Form 15G</button>
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
          {DEPOSITS.map((dep, i) => {
            const status = getDepStatus(dep.title);
            const blk = getAdminProductBlock(dep.title);
            const isBlocked = status === 'APPROVED' && !!blk.adminBlocked;
            return (
              <SectionCard key={i} title={`${dep.icon} ${dep.title}`} subtitle={`Interest rate: ${dep.rate}`}>
                <div className="showcase-meta"><span>Tenure: {dep.tenure}</span><span>Min. amount: {dep.minAmount}</span></div>
                <ul className="showcase-features">{dep.features.map((f, j) => <li key={j}>{f}</li>)}</ul>
                {isBlocked && <span className="badge badge--error">🚫 Blocked by Bank</span>}
                {!isBlocked && status === 'APPROVED' && <span className="badge badge--success">✅ {getDepActiveCount(dep.title) > 1 ? `${getDepActiveCount(dep.title)}× Active` : 'Deposit Active'}</span>}
                {status === 'DECLINED' && <span className="badge badge--error">❌ Last declined</span>}
                {status === 'PENDING' && <span className="badge badge--warning">⏳ Pending Approval</span>}
                {status !== 'PENDING' && !isBlocked && (
                  <button className="button button--sm button--primary" onClick={() => setAppForm({ dep })}>{status === 'APPROVED' ? 'Open Another' : 'Open Deposit'}</button>
                )}
                {isBlocked && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.5rem 0 0' }}>This deposit product is blocked by the bank. Contact support.</p>
                )}
              </SectionCard>
            );
          })}
        </div>
      )}

      {tab === 'calc' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          <SectionCard title="Maturity Calculator" subtitle="Estimate returns before opening a deposit.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['FD', 'RD'].map(t => (
                  <button key={t} onClick={() => setCalcType(t)}
                    style={{ flex: 1, padding: '0.4rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', border: `2px solid ${calcType === t ? 'var(--primary)' : 'var(--line)'}`, background: calcType === t ? 'var(--primary-tint, #eff6ff)' : 'var(--panel-soft)', color: calcType === t ? 'var(--primary)' : 'var(--muted)' }}>
                    {t === 'FD' ? 'Fixed Deposit' : 'Recurring Deposit'}
                  </button>
                ))}
              </div>
              {[['Principal (₹)', calcPrincipal, setCalcPrincipal, calcType === 'RD' ? 'Monthly amount' : 'e.g. 100000'], ['Annual rate (%)', calcRate, setCalcRate, 'e.g. 7.1'], ['Tenure (years)', calcTenure, setCalcTenure, 'e.g. 3']].map(([label, val, setter, ph]) => (
                <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{label}</span>
                  <input type="number" min="0" placeholder={ph} value={val} onChange={e => setter(e.target.value)}
                    style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.95rem' }} />
                </label>
              ))}
              {calcType === 'FD' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Compounding frequency</span>
                  <select value={calcFreq} onChange={e => setCalcFreq(e.target.value)}
                    style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--panel)', fontSize: '0.9rem' }}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="halfyearly">Half-yearly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </label>
              )}
              {calcResult && (
                <div style={{ padding: '0.875rem', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #86efac', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Amount invested</span><span>{fmtINR(calcResult.invested)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Interest earned</span><span style={{ color: '#16a34a' }}>{fmtINR(calcResult.interest)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>Maturity amount</span><span style={{ color: '#16a34a', fontSize: '1.05rem' }}>{fmtINR(calcResult.maturity)}</span></div>
                </div>
              )}
            </div>
          </SectionCard>
          <SectionCard title="Deposit tips" subtitle="Maximise your returns.">
            <ul className="showcase-features">
              <li>Senior citizens earn extra 0.50% on all FDs</li>
              <li>Laddering FDs across tenures ensures liquidity</li>
              <li>Tax-saver FD locks in ₹1.5L u/s 80C</li>
              <li>Premature withdrawal incurs 0.5–1% penalty</li>
              <li>Interest above ₹40,000/year is TDS deductible</li>
              <li>Submit Form 15G/15H to avoid TDS if eligible</li>
            </ul>
          </SectionCard>
        </div>
      )}

      {tab === 'manage' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {/* Auto-renewal */}
          <SectionCard title="Auto-renewal" subtitle="Set deposits to renew automatically at maturity.">
            {activeDeps.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No active deposits yet. Open a deposit to manage renewal preferences.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeDeps.map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--panel-soft)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{d.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Auto-renew: {autoRenewals[d.title] ? 'ON' : 'OFF'}</div>
                    </div>
                    <button onClick={() => toggleAutoRenew(d.title)}
                      style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: autoRenewals[d.title] ? '#16a34a' : 'var(--line)', color: autoRenewals[d.title] ? '#fff' : 'var(--muted)' }}>
                      {autoRenewals[d.title] ? 'ON' : 'OFF'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Documents" subtitle="Switch to My Deposits tab and use the download buttons on each deposit card to get statements and certificates directly to your device.">
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>Each active deposit card in <strong>My Deposits</strong> has download buttons for: Deposit Statement, Deposit Certificate, Interest Certificate, and Form 15G.</p>
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
