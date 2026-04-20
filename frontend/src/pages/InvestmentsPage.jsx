import { useState, useMemo, useEffect } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import WorkflowModal from '../components/WorkflowModal';
import ApplicationFormModal from '../components/ApplicationFormModal';
import { removeProductHistory } from '../utils/products';
import api from '../services/api';
import { downloadFile, openAsPdf } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

function fmtINR0(n) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function seed(s) { let h = 0; for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0; return Math.abs(h); }

const INVESTMENTS = [
  { icon: '', title: 'Mutual Funds', returns: '12-15% p.a.', risk: 'Moderate-High', minInvest: '₹500/month', features: ['SIP starting ₹500', 'Wide fund selection', 'Tax-saving ELSS options'] },
  { icon: '', title: 'PPF (Public Provident Fund)', returns: '7.10% p.a.', risk: 'Low', minInvest: '₹500/year', features: ['15-year lock-in', 'Tax-free returns', 'Government backed'] },
  { icon: '', title: 'NPS (National Pension)', returns: '9-12% p.a.', risk: 'Moderate', minInvest: '₹1,000/year', features: ['Retirement planning', 'Additional ₹50K tax benefit', 'Partial withdrawal allowed'] },
  { icon: '', title: 'Sovereign Gold Bond', returns: '2.50% + gold price', risk: 'Low-Moderate', minInvest: '1 gm gold', features: ['No storage cost', 'Guaranteed interest', '8-year tenure'] },
  { icon: '', title: 'Demat & Trading', returns: 'Market linked', risk: 'High', minInvest: 'No minimum', features: ['Equity & derivatives', 'Real-time trading', 'Research reports'] },
  { icon: '', title: 'Tax Saver FD', returns: '7.00% p.a.', risk: 'Low', minInvest: '₹1,000', features: ['5-year lock-in', 'Section 80C benefit', 'Senior citizen extra 0.5%'] },
];

export default function InvestmentsPage() {
  const { user } = useAuth();
  const [toast, setToast] = useState({ message: '', type: '' });
  const [, refresh] = useState(0);
  const [workflow, setWorkflow] = useState(null);
  const [appForm, setAppForm] = useState(null);
  const [tab, setTab] = useState('products');
  const [dlConfirm, setDlConfirm] = useState(null);
  // SIP calculator
  const [sipAmount, setSipAmount] = useState('');
  const [sipRate, setSipRate] = useState('');
  const [sipYears, setSipYears] = useState('');
  // Lumpsum calculator
  const [lsAmount, setLsAmount] = useState('');
  const [lsRate, setLsRate] = useState('');
  const [lsYears, setLsYears] = useState('');
  const [calcMode, setCalcMode] = useState('sip');

  // Backend block state — fetched once on mount
  const [backendBlocks, setBackendBlocks] = useState([]);

  const invRequests = backendBlocks.filter(b => b.category === 'investments');
  const myInv = invRequests.filter(b => b.status === 'PENDING');
  const invHistory = invRequests
    .filter(b => b.status === 'APPROVED' || b.status === 'DECLINED')
    .map(b => ({ title: b.productTitle, decision: b.status, decidedOn: b.decidedOn, customerName: b.customerName, formData: b.formData || null }));
  const activeInv = invHistory.filter(h => h.decision === 'APPROVED');
  useEffect(() => {
    api.get('/product-requests/my')
      .then(r => setBackendBlocks(r.data?.data || r.data || []))
      .catch(() => {});
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
    const remote = backendBlocks.find(b => b.category === 'investments' && b.productTitle === title && b.status === 'APPROVED');
    return { adminBlocked: remote?.blocked === true };
  };

  const getInvStatus = (title) => {
    const remote = invRequests.find(b => b.productTitle === title);
    return remote ? remote.status : null;
  };

  const confirmInvest = (inv, formData) => {
    setBackendBlocks(prev => [...prev, { category: 'investments', productTitle: inv.title, status: 'PENDING', appliedOn: new Date().toISOString(), decidedOn: null, customerName: user?.customerName || user?.username || '' }]);
    api.post('/product-requests', { category: 'investments', productTitle: inv.title, formData: formData ? JSON.stringify(formData) : null })
      .then(() => {
        api.get('/product-requests/my')
          .then(r => setBackendBlocks(r.data?.data || r.data || []))
          .catch(() => {});
      })
      .catch(() => {
        setBackendBlocks(prev => prev.filter(b => !(b.category === 'investments' && b.productTitle === inv.title && b.status === 'PENDING')));
      });
    removeProductHistory('investments', inv.title);
    setToast({ message: `"${inv.title}" investment initiated! Check your portfolio for tracking.`, type: 'success' });
    setWorkflow(null);
    setTab('myportfolio');
    refresh(n => n + 1);
  };


  

  // SIP corpus
  const sipResult = useMemo(() => {
    const P = parseFloat(sipAmount);
    const r = parseFloat(sipRate) / 12 / 100;
    const n = parseFloat(sipYears) * 12;
    if (!P || !r || !n) return null;
    const corpus = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    return { corpus, invested: P * n, gains: corpus - P * n };
  }, [sipAmount, sipRate, sipYears]);

  // Lumpsum corpus
  const lsResult = useMemo(() => {
    const P = parseFloat(lsAmount);
    const r = parseFloat(lsRate) / 100;
    const t = parseFloat(lsYears);
    if (!P || !r || !t) return null;
    const corpus = P * Math.pow(1 + r, t);
    return { corpus, invested: P, gains: corpus - P };
  }, [lsAmount, lsRate, lsYears]);

  // 80C usage
  const TAX_INSTRUMENTS = [
    { name: 'ELSS (Mutual Funds)', limit: 150000 },
    { name: 'PPF', limit: 150000 },
    { name: 'Tax Saver FD', limit: 150000 },
    { name: 'NPS (Tier I)', limit: 200000 },
  ];
  const activeInvNames = activeInv.map(a => a.title);
  const sec80C = TAX_INSTRUMENTS.filter(t => activeInvNames.some(n => n.includes(t.name.split(' ')[0])));
  const total80C = Math.min(sec80C.reduce((s, t) => s + t.limit, 0), 150000);
  const nps50k = activeInvNames.some(n => n.includes('NPS')) ? 50000 : 0;

  return (
    <AppShell role="CUSTOMER" title="Investments" subtitle="Grow your wealth with our curated investment products.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      <WorkflowModal {...(workflow || {})} open={!!workflow} onClose={() => setWorkflow(null)} />
      <ApplicationFormModal
        open={!!appForm}
        onClose={() => setAppForm(null)}
        category="investments"
        productTitle={appForm?.inv?.title || ''}
        productIcon={appForm?.inv?.icon || ''}
        productSubtitle={appForm ? `Returns: ${appForm.inv.returns} | Risk: ${appForm.inv.risk}` : ''}
        onSubmit={(formData) => {
          const p = appForm.inv;
          setAppForm(null);
          try { localStorage.setItem(`nova_app_investments_${p.title}`, JSON.stringify({ ...formData, appliedOn: new Date().toISOString() })); } catch {}
          setWorkflow({ icon: p.icon, title: `Invest in ${p.title}`, subtitle: `Returns: ${p.returns} | Risk: ${p.risk}`, details: [['Mode', formData.investmentMode || '—'], ['Amount', `₹${Number(formData.amount || 0).toLocaleString('en-IN')}`], ['Goal', formData.investmentGoal || '—'], ['Risk', formData.riskProfile || '—']], steps: ['Application submitted', 'KYC verification', 'Amount debited from savings', 'Investment confirmed & tracking begins'], confirmLabel: 'Start Investment', onConfirm: () => confirmInvest(p, formData) });
        }}
      />

      <div className="showcase-hero showcase-hero--investments">
        <div className="showcase-hero__stat"><span className="showcase-hero__label">Start SIP from</span><span className="showcase-hero__value">₹500/mo</span></div>
        <div className="showcase-hero__stat"><span className="showcase-hero__label">My investments</span><span className="showcase-hero__value">{myInv.length + activeInv.length}</span></div>
        <div className="showcase-hero__stat"><span className="showcase-hero__label">Tax saving</span><span className="showcase-hero__value">Up to ₹1.5L</span></div>
      </div>

      {(myInv.length > 0 || invHistory.length > 0) && (
        <SectionCard title="My investments" subtitle={`${myInv.length + invHistory.length} investment application(s) on record.`}>
          <div className="my-products-strip">
            {myInv.map((p, i) => <span key={i} className="my-product-chip">⏳ {p.productTitle} — <em>Pending admin approval</em></span>)}
            {invHistory.map((h, i) => {
              const blk = getAdminProductBlock(h.title);
              const isBlocked = h.decision === 'APPROVED' && !!blk.adminBlocked;
              const chipClass = isBlocked ? 'declined' : h.decision === 'APPROVED' ? 'approved' : 'declined';
              const icon = isBlocked ? '🚫' : h.decision === 'APPROVED' ? '✅' : '❌';
              const label = isBlocked ? 'Blocked by bank': h.decision === 'APPROVED' ? 'Investment active' : 'Declined';
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
        <button className={`tab-bar__tab${tab === 'products' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('products')}>Products</button>
        <button className={`tab-bar__tab${tab === 'myportfolio' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('myportfolio')}>My Portfolio</button>
        <button className={`tab-bar__tab${tab === 'calc' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('calc')}>SIP / Lumpsum Calculator</button>
      </div>

      {tab === 'myportfolio' && (
        <>
          {myInv.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.25rem' }}>
              {myInv.map((req, idx) => {
                const def = INVESTMENTS.find(d => d.title === req.productTitle) || {};
                return (
                  <SectionCard key={`pending-${idx}`} title={`${def.icon || ''} ${req.productTitle}`} subtitle="Pending admin approval">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '10px', background: '#fefce8', border: '1.5px solid #fcd34d' }}>
                      <span style={{ fontSize: '1.5rem' }}>⏳</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#92400e' }}>Application under review</div>
                        <div style={{ fontSize: '0.82rem', color: '#a16207', marginTop: '0.2rem' }}>Your investment application has been submitted. Portfolio details will appear here once the admin approves it.</div>
                      </div>
                    </div>
                    {def.returns && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
                        <span>Expected returns: <strong>{def.returns}</strong></span>
                        <span>Risk: <strong>{def.risk}</strong></span>
                        <span>Min investment: <strong>{def.minInvest}</strong></span>
                      </div>
                    )}
                  </SectionCard>
                );
              })}
            </div>
          )}
          {activeInv.length === 0 && myInv.length === 0 ? (
            <SectionCard title="No active investments" subtitle="Start investing from the Products tab. Once approved, your portfolio will appear here.">
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>Current value, returns, and investment details will be shown here after admin approves your investment.</p>
            </SectionCard>
          ) : activeInv.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {activeInv.map((inv, idx) => {
                const def = INVESTMENTS.find(d => d.title === inv.title) || {};
                const blk = getAdminProductBlock(inv.title);
                const isBlocked = !!blk.adminBlocked;
                const s = seed(inv.title);
                const parsedForm = (() => { try { return inv.formData ? JSON.parse(inv.formData) : null; } catch { return null; } })();
                const rateStr = def.returns || '10% p.a.';
                const rateNum = parseFloat(rateStr) || 10;
                const isSIP = def.title === 'Mutual Funds' || def.title === 'NPS (National Pension)';
                const monthlyAmt = Number(parsedForm?.amount) || (s % 9 + 1) * 500;
                const lumpAmt = Number(parsedForm?.amount) || (s % 10 + 1) * 10000;
                const startDate = new Date(inv.decidedOn);
                const now = new Date();
                const monthsElapsed = Math.max(1, Math.floor((now - startDate) / (1000 * 60 * 60 * 24 * 30.44)));
                const r = rateNum / 12 / 100;

                let invested, currentValue, gainPct;
                if (isSIP) {
                  invested = monthlyAmt * monthsElapsed;
                  currentValue = monthlyAmt * ((Math.pow(1 + r, monthsElapsed) - 1) / r) * (1 + r);
                } else {
                  invested = lumpAmt;
                  currentValue = lumpAmt * Math.pow(1 + rateNum / 100, monthsElapsed / 12);
                }
                const gain = currentValue - invested;
                gainPct = ((gain / invested) * 100).toFixed(1);
                const acctNo = `INV-${(s % 900000 + 100000)}`;

                const genStatement = () => {
                  const rows = ['Date,Description,Invested (INR),Units,NAV (INR),Current Value (INR)'];
                  let cumValue = 0, cumUnits = 0;
                  const baseNAV = 10 + (s % 40);
                  for (let m = 1; m <= Math.min(monthsElapsed, 24); m++) {
                    const nav = baseNAV * Math.pow(1 + rateNum / 100, m / 12);
                    const invest = isSIP ? monthlyAmt : (m === 1 ? lumpAmt : 0);
                    const units = invest / nav;
                    cumUnits += units; cumValue = cumUnits * nav;
                    const d = new Date(startDate); d.setMonth(d.getMonth() + m);
                    if (invest > 0) rows.push(`${d.toLocaleDateString('en-IN')},${isSIP ? 'SIP Purchase' : 'Lumpsum Purchase'},${invest.toFixed(2)},${units.toFixed(4)},${nav.toFixed(2)},${cumValue.toFixed(2)}`);
                  }
                  downloadFile(`portfolio_statement_${acctNo}.csv`, '\uFEFF' + rows.join('\n'), 'text/csv;charset=utf-8');
                  setToast({ message: 'Portfolio Statement downloaded.', type: 'success' });
                };

                const genCapGainsReport = () => {
                  const text = `NOVA BANK\nCAPITAL GAINS STATEMENT — FY 2025-26\n${'='.repeat(40)}\nAccount No   : ${acctNo}\nInvestment   : ${inv.title}\nCustomer     : ${inv.customerName || 'Customer'}\n\nTotal Invested : ${fmtINR0(Math.round(invested))}\nCurrent Value  : ${fmtINR0(Math.round(currentValue))}\nUnrealised Gain: ${fmtINR0(Math.round(gain))} (${gainPct}%)\n\nHolding Period : ${monthsElapsed} months\nTax Type       : ${monthsElapsed >= 12 ? 'LTCG (10% above ₹1L gains)' : 'STCG (15% flat)'}\n\nNova Bank Investment Services Ltd.`;
                  openAsPdf('Capital Gains Statement — FY 2025-26', text);
                  setToast({ message: 'Capital Gains Report opened for PDF download.', type: 'success' });
                };

                return (
                  <SectionCard key={idx} title={`${def.icon || ''} ${inv.title}`} subtitle={`Account: ${acctNo}  •  ${isBlocked ? '🚫 Blocked' : '✅ Active'}  •  Since: ${startDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}>
                    {isBlocked && (
                      <div style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', background: isBlocked ? '#faf5ff' : '#fff7ed', border: `1.5px solid ${isBlocked ? '#c4b5fd' : '#fdba74'}`, fontSize: '0.85rem', fontWeight: 600, color: isBlocked ? '#7c3aed' : '#c2410c', marginBottom: '1rem' }}>
                        {isBlocked ? '🚫 This investment has been blocked by the bank. Trading and redemption are currently unavailable. Contact support.' : '🔒 This investment has been temporarily suspended by the bank. Contact support for details.'}
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '0.625rem', marginBottom: '1rem' }}>
                      {[['Invested', fmtINR0(Math.round(invested))], [isSIP ? 'Monthly SIP' : 'Lumpsum', fmtINR0(isSIP ? monthlyAmt : lumpAmt)], ['Current Value', fmtINR0(Math.round(currentValue))], ['Gain / Loss', `${fmtINR0(Math.round(gain))} (${gainPct}%)`], ['Returns p.a.', `~${rateNum}%`], ['Held for', `${monthsElapsed} months`]].map(([k, v]) => (
                        <div key={k} style={{ padding: '0.625rem', borderRadius: '8px', background: gain >= 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${gain >= 0 ? '#bbf7d0' : '#fecaca'}` }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{k}</div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: k === 'Gain / Loss' ? (gain >= 0 ? '#16a34a' : '#dc2626') : undefined }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <button className="button button--sm button--ghost" onClick={() => setDlConfirm({ label: 'Portfolio Statement', fn: genStatement })}>📊 Portfolio Statement</button>
                      <button className="button button--sm button--ghost" onClick={() => setDlConfirm({ label: 'Capital Gains Report', fn: genCapGainsReport })}>🧾 Capital Gains Report</button>
                     
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
          {INVESTMENTS.map((inv, i) => {
            const status = getInvStatus(inv.title);
            const blk = getAdminProductBlock(inv.title);
            const isBlocked = status === 'APPROVED' && !!blk.adminBlocked;
            return (
              <SectionCard key={i} title={`${inv.icon} ${inv.title}`} subtitle={`Expected returns: ${inv.returns}`}>
                <div className="showcase-meta"><span>Risk: {inv.risk}</span><span>Min investment: {inv.minInvest}</span></div>
                <ul className="showcase-features">{inv.features.map((f, j) => <li key={j}>{f}</li>)}</ul>
                {isBlocked && <span className="badge badge--error">🚫 Blocked by Bank</span>}
                {!isBlocked && status === 'APPROVED' && <span className="badge badge--success">✅ Investment Active</span>}
                {status === 'DECLINED' && <span className="badge badge--error">❌ Declined</span>}
                {status === 'PENDING' && <span className="badge badge--warning">⏳ Pending Approval</span>}
                {(!status || status === 'DECLINED') && !isBlocked && (
                  <button className="button button--sm button--primary" onClick={() => setAppForm({ inv })}>{status === 'DECLINED' ? 'Re-apply' : 'Invest Now'}</button>
                )}
                {isBlocked && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.5rem 0 0' }}>{isBlocked ? 'This investment has been blocked by the bank. Contact support.' : 'This investment is temporarily suspended.'}</p>
                )}
              </SectionCard>
            );
          })}
        </div>
      )}

      {tab === 'calc' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          <SectionCard title="Investment Calculator" subtitle="Project your future corpus.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[['sip', 'SIP'], ['lumpsum', 'Lumpsum']].map(([m, label]) => (
                  <button key={m} onClick={() => setCalcMode(m)}
                    style={{ flex: 1, padding: '0.4rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', border: `2px solid ${calcMode === m ? 'var(--primary)' : 'var(--line)'}`, background: calcMode === m ? 'var(--primary-tint, #eff6ff)' : 'var(--panel-soft)', color: calcMode === m ? 'var(--primary)' : 'var(--muted)' }}>
                    {label}
                  </button>
                ))}
              </div>
              {calcMode === 'sip' ? (
                <>
                  {[['Monthly SIP amount (₹)', sipAmount, setSipAmount, 'e.g. 5000'], ['Expected annual return (%)', sipRate, setSipRate, 'e.g. 12'], ['Investment period (years)', sipYears, setSipYears, 'e.g. 10']].map(([label, val, setter, ph]) => (
                    <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{label}</span>
                      <input type="number" min="0" placeholder={ph} value={val} onChange={e => setter(e.target.value)}
                        style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.95rem' }} />
                    </label>
                  ))}
                  {sipResult && (
                    <div style={{ padding: '0.875rem', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #86efac', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Total invested</span><span>{fmtINR0(sipResult.invested)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Estimated gains</span><span style={{ color: '#16a34a' }}>{fmtINR0(sipResult.gains)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>Future corpus</span><span style={{ color: '#16a34a', fontSize: '1.05rem' }}>{fmtINR0(sipResult.corpus)}</span></div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {[['Lumpsum amount (₹)', lsAmount, setLsAmount, 'e.g. 100000'], ['Expected annual return (%)', lsRate, setLsRate, 'e.g. 12'], ['Investment period (years)', lsYears, setLsYears, 'e.g. 10']].map(([label, val, setter, ph]) => (
                    <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{label}</span>
                      <input type="number" min="0" placeholder={ph} value={val} onChange={e => setter(e.target.value)}
                        style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.95rem' }} />
                    </label>
                  ))}
                  {lsResult && (
                    <div style={{ padding: '0.875rem', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #86efac', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Amount invested</span><span>{fmtINR0(lsResult.invested)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Estimated gains</span><span style={{ color: '#16a34a' }}>{fmtINR0(lsResult.gains)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>Future value</span><span style={{ color: '#16a34a', fontSize: '1.05rem' }}>{fmtINR0(lsResult.corpus)}</span></div>
                    </div>
                  )}
                </>
              )}
            </div>
          </SectionCard>
          <SectionCard title="Investment tips" subtitle="Smart investing habits.">
            <ul className="showcase-features">
              <li>Start early — compounding rewards patience</li>
              <li>Diversify across equity, debt, and gold</li>
              <li>Review and rebalance your portfolio annually</li>
              <li>Don’t try to time the market; stay invested</li>
              <li>ELSS has lowest lock-in (3 yrs) among 80C options</li>
              <li>Step-up SIP by 10% each year to grow corpus faster</li>
            </ul>
          </SectionCard>
        </div>
      )}

      {tab === 'tax' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
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
