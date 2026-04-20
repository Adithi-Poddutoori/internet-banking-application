import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import WorkflowModal from '../components/WorkflowModal';
import ApplicationFormModal from '../components/ApplicationFormModal';
import api from '../services/api';
import { downloadFile, openAsPdf } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

const CLAIMS_KEY = 'nova_insurance_claims';
function saveClaim(entry) {
  try {
    const all = JSON.parse(localStorage.getItem(CLAIMS_KEY) || '[]');
    all.unshift(entry);
    localStorage.setItem(CLAIMS_KEY, JSON.stringify(all.slice(0, 200)));
  } catch { /* ignore */ }
}

function seed(s) { let h = 0; for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0; return Math.abs(h); }

const PLANS = [
  { icon: '', title: 'Term Life Insurance', premium: '₹500/month', cover: '₹1 Cr', features: ['Pure protection plan', 'High cover at low cost', 'Tax benefit u/s 80C'] },
  { icon: '', title: 'Health Insurance', premium: '₹800/month', cover: '₹10 Lakh', features: ['Cashless at 10,000+ hospitals', 'No room rent capping', 'Day-care procedures covered'] },
  { icon: '', title: 'Family Floater', premium: '₹1,200/month', cover: '₹15 Lakh', features: ['Covers entire family', 'No-claim bonus', 'Maternity benefit'] },
  { icon: '', title: 'Motor Insurance', premium: '₹3,000/year', cover: 'IDV based', features: ['Comprehensive cover', 'Own damage + third party', 'Roadside assistance'] },
  { icon: '', title: 'Travel Insurance', premium: '₹250/trip', cover: '₹25 Lakh', features: ['Trip cancellation cover', 'Medical emergency abroad', 'Lost baggage protection'] },
  { icon: '', title: 'Home Insurance', premium: '₹2,000/year', cover: '₹50 Lakh', features: ['Structure + content cover', 'Natural disasters covered', 'Theft & burglary'] },
];

export default function InsurancePage() {
  const { user } = useAuth();
  const [toast, setToast] = useState({ message: '', type: '' });
  const [, refresh] = useState(0);
  const [workflow, setWorkflow] = useState(null);
  const [appForm, setAppForm] = useState(null);
  const [tab, setTab] = useState('products');
  const [dlConfirm, setDlConfirm] = useState(null);
  // Claim state
  const [claimPolicy, setClaimPolicy] = useState('');
  const [claimType, setClaimType] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [claimDate, setClaimDate] = useState('');
  const [claimDesc, setClaimDesc] = useState('');
  // Nominee update state
  const [nomineePolicy, setNomineePolicy] = useState('');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRel, setNomineeRel] = useState('');

  // Backend block state — fetched once on mount
  const [backendBlocks, setBackendBlocks] = useState([]);

  const insRequests = backendBlocks.filter(b => b.category === 'insurance');
  const myIns = insRequests.filter(b => b.status === 'PENDING');
  const insHistory = insRequests
    .filter(b => b.status === 'APPROVED' || b.status === 'DECLINED')
    .map(b => ({ title: b.productTitle, decision: b.status, decidedOn: b.decidedOn, customerName: b.customerName, formData: b.formData || null }));
  const activeIns = insHistory.filter(h => h.decision === 'APPROVED');
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

  function getAdminProductBlock(title) {
    const remote = backendBlocks.find(b => b.category === 'insurance' && b.productTitle === title && b.status === 'APPROVED');
    return { adminBlocked: remote?.blocked === true, adminSuspended: false };
  }

  const getInsStatus = (title) => {
    const remote = insRequests.find(b => b.productTitle === title);
    return remote ? remote.status : null;
  };

  const getInsActiveCount = (title) => insRequests.filter(b => b.productTitle === title && b.status === 'APPROVED').length;

  const confirmQuote = (plan, formData) => {
    setBackendBlocks(prev => [...prev, { category: 'insurance', productTitle: plan.title, status: 'PENDING', appliedOn: new Date().toISOString(), decidedOn: null, customerName: user?.customerName || user?.username || '' }]);
    api.post('/product-requests', { category: 'insurance', productTitle: plan.title, formData: formData ? JSON.stringify(formData) : null })
      .then(() => {
        api.get('/product-requests/my')
          .then(r => setBackendBlocks(r.data?.data || r.data || []))
          .catch(() => {});
      })
      .catch(() => {
        setBackendBlocks(prev => prev.filter(b => !(b.category === 'insurance' && b.productTitle === plan.title && b.status === 'PENDING')));
      });
    const coverDisplay = formData?.sumAssured ? `₹${Number(formData.sumAssured).toLocaleString('en-IN')}` : plan.cover;
    setToast({ message: `"${plan.title}" policy activated! Cover: ${coverDisplay}. Premium: ${plan.premium}.`, type: 'success' });
    setWorkflow(null);
    setTab('mypolicies');
    refresh(n => n + 1);
  };

  const submitClaim = async () => {
    if (!claimPolicy) return setToast({ message: 'Select a policy.', type: 'error' });
    if (!claimType.trim()) return setToast({ message: 'Enter claim type.', type: 'error' });
    if (!claimAmount || Number(claimAmount) <= 0) return setToast({ message: 'Enter valid claim amount.', type: 'error' });
    if (!claimDate) return setToast({ message: 'Select incident date.', type: 'error' });
    try {
      const res = await api.post('/insurance-claims', {
        policy: claimPolicy,
        type: claimType,
        amount: Number(claimAmount),
        incidentDate: claimDate,
        description: claimDesc,
      });
      const saved = res.data?.data;
      setToast({ message: `Claim for ₹${Number(claimAmount).toLocaleString('en-IN')} under "${claimPolicy}" submitted. Reference: ${saved?.ref}. Our team will contact you within 2 working days.`, type: 'success' });
    } catch {
      // Fallback: store in localStorage so the claim isn't lost
      const ref = `CLM-${Date.now().toString().slice(-6)}`;
      saveClaim({
        id: Date.now(),
        ref,
        policy: claimPolicy,
        type: claimType,
        amount: Number(claimAmount),
        incidentDate: claimDate,
        description: claimDesc,
        username: user?.username || '',
        customerName: user?.displayName || user?.customerName || user?.username || '',
        submittedAt: new Date().toISOString(),
        status: 'PENDING',
      });
      setToast({ message: `Claim submitted (offline). Reference: ${ref}. Will sync when connection is restored.`, type: 'success' });
    }
    setClaimPolicy(''); setClaimType(''); setClaimAmount(''); setClaimDate(''); setClaimDesc('');
  };

  const updateNominee = () => {
    if (!nomineePolicy) return setToast({ message: 'Select a policy.', type: 'error' });
    if (!nomineeName.trim()) return setToast({ message: 'Enter nominee name.', type: 'error' });
    if (!nomineeRel.trim()) return setToast({ message: 'Enter relationship.', type: 'error' });
    setToast({ message: `Nominee "${nomineeName}" updated for "${nomineePolicy}".`, type: 'success' });
    setNomineePolicy(''); setNomineeName(''); setNomineeRel('');
  };

  // Deterministic next-due dates per policy
  const getNextDueDate = (title) => {
    const seed = title.length * 7;
    const d = new Date();
    d.setDate(d.getDate() + seed % 28 + 1);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <AppShell role="CUSTOMER" title="Insurance" subtitle="Protect yourself and your family with comprehensive insurance plans.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      <WorkflowModal {...(workflow || {})} open={!!workflow} onClose={() => setWorkflow(null)} />
      <ApplicationFormModal
        open={!!appForm}
        onClose={() => setAppForm(null)}
        category="insurance"
        productTitle={appForm?.plan?.title || ''}
        productIcon={appForm?.plan?.icon || ''}
        productSubtitle={appForm ? `Premium: ${appForm.plan.premium} | Cover: ${appForm.plan.cover}` : ''}
        onSubmit={(formData) => {
          const p = appForm.plan;
          setAppForm(null);
          try { localStorage.setItem(`nova_app_insurance_${p.title}`, JSON.stringify({ ...formData, appliedOn: new Date().toISOString() })); } catch {}
          setWorkflow({ icon: p.icon, title: `Apply for ${p.title}`, subtitle: `Premium: ${p.premium} | Cover: ${p.cover}`, details: [['Sum Assured', `₹${Number(formData.sumAssured || 0).toLocaleString('en-IN')}`], ['Policy Term', `${formData.policyTerm || '—'} years`], ['Beneficiary', formData.beneficiaryName || '—'], ['Frequency', formData.premiumFrequency || '—']], steps: ['Application submitted', 'Health declaration reviewed', 'Premium auto-debit setup', 'Policy document issued'], confirmLabel: 'Activate Policy', onConfirm: () => confirmQuote(p, formData) });
        }}
      />

      <div className="showcase-hero showcase-hero--insurance">
        <div className="showcase-hero__stat"><span className="showcase-hero__label">Life cover from</span><span className="showcase-hero__value">₹500/mo</span></div>
        <div className="showcase-hero__stat"><span className="showcase-hero__label">My policies</span><span className="showcase-hero__value">{myIns.length + activeIns.length}</span></div>
        <div className="showcase-hero__stat"><span className="showcase-hero__label">Plans</span><span className="showcase-hero__value">{PLANS.length}</span></div>
      </div>

      {(myIns.length > 0 || insHistory.length > 0) && (
        <SectionCard title="My insurance policies" subtitle={`${myIns.length + insHistory.length} policy application(s) on record.`}>
          <div className="my-products-strip">
            {myIns.map((p, i) => <span key={i} className="my-product-chip">⏳ {p.productTitle} — <em>Pending admin approval</em></span>)}
            {insHistory.map((h, i) => {
              const blk = getAdminProductBlock(h.title);
              const isBlocked = h.decision === 'APPROVED' && !!blk.adminBlocked;
              return (
                <span key={`h-${i}`} className={`my-product-chip my-product-chip--${isBlocked ? 'declined' : h.decision === 'APPROVED' ? 'approved' : 'declined'}`}>
                  {isBlocked ? '🚫' : h.decision === 'APPROVED' ? '✅' : '❌'} {h.title} — <em>{isBlocked ? 'Blocked by bank' : h.decision === 'APPROVED' ? 'Policy active' : 'Declined'}</em>
                </span>
              );
            })}
          </div>
        </SectionCard>
      )}

      <div className="tab-bar" style={{ marginBottom: '1.25rem' }}>
        <button className={`tab-bar__tab${tab === 'products' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('products')}>Plans</button>
        <button className={`tab-bar__tab${tab === 'mypolicies' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('mypolicies')}>My Policies</button>
        <button className={`tab-bar__tab${tab === 'claim' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('claim')}>File a Claim</button>
        <button className={`tab-bar__tab${tab === 'manage' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('manage')}>Manage</button>
      </div>

      {tab === 'mypolicies' && (
        <>
          {myIns.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.25rem' }}>
              {myIns.map((req, idx) => {
                const def = PLANS.find(p => p.title === req.productTitle) || {};
                return (
                  <SectionCard key={`pending-${idx}`} title={`${def.icon || ''} ${req.productTitle}`} subtitle="Pending admin approval">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '10px', background: '#fefce8', border: '1.5px solid #fcd34d' }}>
                      <span style={{ fontSize: '1.5rem' }}>⏳</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#92400e' }}>Application under review</div>
                        <div style={{ fontSize: '0.82rem', color: '#a16207', marginTop: '0.2rem' }}>Your policy application has been submitted and is pending admin approval. Policy details will appear here once approved.</div>
                      </div>
                    </div>
                    {def.premium && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
                        <span>Premium: <strong>{def.premium}</strong></span>
                        <span>Cover: <strong>{def.cover}</strong></span>
                      </div>
                    )}
                  </SectionCard>
                );
              })}
            </div>
          )}
          {activeIns.length === 0 && myIns.length === 0 ? (
            <SectionCard title="No active policies" subtitle="Activate an insurance plan from the Plans tab. Once approved, full policy details appear here.">
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>Policy number, cover amount, premium schedule, and renewal dates will be shown here.</p>
            </SectionCard>
          ) : activeIns.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {activeIns.map((ins, idx) => {
                const def = PLANS.find(p => p.title === ins.title) || {};
                const blk = getAdminProductBlock(ins.title);
                const isBlocked    = !!blk.adminBlocked;
                const parsedForm = (() => { try { return ins.formData ? JSON.parse(ins.formData) : null; } catch { return null; } })();
                const coverAmount = parsedForm?.sumAssured ? `₹${Number(parsedForm.sumAssured).toLocaleString('en-IN')}` : (def.cover || '—');
                const s = seed(ins.title);
                const policyNo = `NOV-${new Date(ins.decidedOn).getFullYear()}-${(s % 900000 + 100000)}`;
                const startDate = new Date(ins.decidedOn);
                const renewalDate = new Date(startDate);
                renewalDate.setFullYear(renewalDate.getFullYear() + 1);
                const now = new Date();
                while (renewalDate < now) renewalDate.setFullYear(renewalDate.getFullYear() + 1);
                const daysToRenewal = Math.ceil((renewalDate - now) / (1000 * 60 * 60 * 24));

                const genPolicyCert = () => {
                  const text = `NOVA BANK INSURANCE\nPOLICY CERTIFICATE\n${'='.repeat(40)}\nPolicy Number : ${policyNo}\nPolicy Type   : ${ins.title}\nPolicyholder  : ${ins.customerName || 'Customer'}\nCover Amount  : ${coverAmount}\nPremium       : ${def.premium || '—'}\nStart Date    : ${startDate.toLocaleDateString('en-IN')}\nNext Renewal  : ${renewalDate.toLocaleDateString('en-IN')}\nStatus        : ACTIVE\n\nThis certificate is valid subject to regular premium payment.\nNova Bank Insurance Services Ltd.`;
                  openAsPdf('Policy Certificate', text);
                  setToast({ message: 'Policy Certificate opened for PDF download.', type: 'success' });
                };

                const genPremiumReceipt = () => {
                  const text = `NOVA BANK INSURANCE\nPREMIUM RECEIPT\n${'='.repeat(40)}\nPolicy Number  : ${policyNo}\nPolicyholder   : ${ins.customerName || 'Customer'}\nPremium Amount : ${def.premium || '—'}\nPayment Date   : ${now.toLocaleDateString('en-IN')}\nPayment Mode   : Auto-debit from savings account\nReceipt No     : REC-${(s % 900000 + 100000)}\nNext Due Date  : ${renewalDate.toLocaleDateString('en-IN')}\n\nThank you for your payment.\nNova Bank Insurance Services Ltd.`;
                  openAsPdf('Premium Receipt', text);
                  setToast({ message: 'Premium Receipt opened for PDF download.', type: 'success' });
                };

                const genClaimForm = () => {
                  const text = `NOVA BANK INSURANCE\nCLAIM SUBMISSION FORM\n${'='.repeat(40)}\nPolicy Number : ${policyNo}\nPolicy Type   : ${ins.title}\nPolicyholder  : ${ins.customerName || 'Customer'}\n\nCLAIM DETAILS (to be filled by claimant)\n\nDate of Incident     : ____________________\nType of Claim        : ____________________\nClaim Amount (INR)   : ____________________\nDescription          : ____________________\n                       ____________________\n\nDeclaration: I hereby declare that the above information is true and correct.\n\nSignature: ____________________  Date: ________________\n\nSubmit with supporting documents to nearest Nova Bank branch.`;
                  openAsPdf('Claim Submission Form', text);
                  setToast({ message: 'Claim Form opened for PDF download.', type: 'success' });
                };

                return (
                  <SectionCard key={idx} title={`${def.icon || ''} ${ins.title}`} subtitle={`Policy: ${policyNo}  •  Status: ${isBlocked ? '🚫 Blocked by Bank'  : '✅ Active'}  •  Since: ${startDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}>
                    {(isBlocked) && (
                      <div style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', background: isBlocked ? '#faf5ff' : '#fff7ed', border: `1.5px solid ${isBlocked ? '#c4b5fd' : '#fdba74'}`, fontSize: '0.85rem', fontWeight: 600, color: isBlocked ? '#7c3aed' : '#c2410c', marginBottom: '1rem' }}>
                        {isBlocked ? '🚫 This policy has been blocked by the bank. All benefits and claims are suspended. Contact support.' : '🔒 This policy has been temporarily suspended by the bank. Contact support for details.'}
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.625rem', marginBottom: '1rem' }}>
                      {[['Cover Amount', coverAmount], ['Premium', def.premium || '—'], ['Next Renewal', renewalDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })], ['Days to Renewal', `${daysToRenewal} days`]].map(([k, v]) => (
                        <div key={k} style={{ padding: '0.625rem', borderRadius: '8px', background: daysToRenewal <= 30 && k === 'Days to Renewal' ? '#fef9c3' : 'var(--panel-soft)', border: `1px solid ${daysToRenewal <= 30 && k === 'Days to Renewal' ? '#fcd34d' : 'var(--line)'}` }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{k}</div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {daysToRenewal <= 30 && (
                      <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: '#fef9c3', border: '1px solid #fcd34d', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                        ⚠️ Premium renewal due in <strong>{daysToRenewal} days</strong>. Ensure funds are available for auto-debit.
                      </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <button className="button button--sm button--ghost" onClick={() => setDlConfirm({ label: 'Policy Certificate', fn: genPolicyCert })}>📜 Policy Certificate</button>
                      <button className="button button--sm button--ghost" onClick={() => setDlConfirm({ label: 'Premium Receipt', fn: genPremiumReceipt })}>💳 Premium Receipt</button>
                      <button className="button button--sm button--ghost" onClick={() => setDlConfirm({ label: 'Blank Claim Form', fn: genClaimForm })}>📄 Blank Claim Form</button>
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
          {PLANS.map((plan, i) => {
            const status = getInsStatus(plan.title);
            const blk = getAdminProductBlock(plan.title);
            const isBlocked = status === 'APPROVED' && !!blk.adminBlocked;
            return (
              <SectionCard key={i} title={`${plan.icon || ''} ${plan.title}`} subtitle={`Premium: ${plan.premium}`}>
                <div className="showcase-meta"><span>Cover: {plan.cover}</span></div>
                <ul className="showcase-features">{plan.features.map((f, j) => <li key={j}>{f}</li>)}</ul>
                {isBlocked && <span className="badge badge--error">🚫 Blocked by Bank</span>}
                {!isBlocked && status === 'APPROVED' && <span className="badge badge--success">✅ {getInsActiveCount(plan.title) > 1 ? `${getInsActiveCount(plan.title)}× Active` : 'Policy Active'}</span>}
                {status === 'DECLINED' && <span className="badge badge--error">❌ Last declined</span>}
                {status === 'PENDING' && <span className="badge badge--warning">⏳ Pending Approval</span>}
                {status !== 'PENDING' && !isBlocked && (
                  <button className="button button--sm button--primary" onClick={() => setAppForm({ plan })}>{status === 'APPROVED' ? 'Add Another Policy' : 'Apply'}</button>
                )}
                {isBlocked && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.5rem 0 0' }}>{isBlocked ? 'This plan is blocked by the bank. Please contact support.' : 'This plan is temporarily suspended.'}</p>
                )}
              </SectionCard>
            );
          })}
        </div>
      )}

      {tab === 'claim' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          <SectionCard title="File a Claim" subtitle="Submit a claim for your active insurance policy.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Policy <span style={{ color: 'var(--danger)' }}>*</span></span>
                <select value={claimPolicy} onChange={e => setClaimPolicy(e.target.value)}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--panel)', fontSize: '0.9rem' }}>
                  <option value="">— Select policy —</option>
                  {activeIns.map((p, i) => <option key={i} value={p.title}>{p.title}</option>)}
                  {activeIns.length === 0 && <option disabled>No active policies yet</option>}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Claim type <span style={{ color: 'var(--danger)' }}>*</span></span>
                <input type="text" placeholder="e.g. Hospitalisation, Accident, Fire…" value={claimType} onChange={e => setClaimType(e.target.value)}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Claim amount (₹) <span style={{ color: 'var(--danger)' }}>*</span></span>
                <input type="text" inputMode="numeric" maxLength={10} min="0" placeholder="e.g. 50000" value={claimAmount} onChange={e => setClaimAmount(e.target.value.replace(/\D/g, ''))}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Incident date <span style={{ color: 'var(--danger)' }}>*</span></span>
                <input type="date" value={claimDate} onChange={e => setClaimDate(e.target.value)}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Description</span>
                <textarea rows={3} placeholder="Brief description of the incident…" value={claimDesc} onChange={e => setClaimDesc(e.target.value)}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.875rem', resize: 'vertical' }} />
              </label>
              <button className="button button--primary" onClick={submitClaim}>Submit Claim</button>
            </div>
          </SectionCard>
          <SectionCard title="Claim process" subtitle="What happens after you file.">
            <ul className="showcase-features">
              <li>Claim reviewed by our team within 2 working days</li>
              <li>Upload supporting documents (bills, FIR, photos) if required</li>
              <li>Cashless claims settled directly with hospitals</li>
              <li>Reimbursement claims credited within 7 days</li>
              <li>Track claim status at the branch or helpline</li>
              <li>Disputes escalated to IRDAI within 30 days</li>
            </ul>
          </SectionCard>
        </div>
      )}

      {tab === 'manage' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {/* Premium due tracker */}
          <SectionCard title="Premium Due Tracker" subtitle="Upcoming premium payment dates.">
            {activeIns.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No active policies. Activate a plan above to track premiums.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeIns.map((p, i) => {
                  const plan = PLANS.find(pl => pl.title === p.title);
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--panel-soft)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Premium: {plan?.premium || '—'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)' }}>Next due</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{getNextDueDate(p.title)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Nominee update */}
          <SectionCard title="Update Nominee" subtitle="Change or add a nominee for any active policy.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Policy</span>
                <select value={nomineePolicy} onChange={e => setNomineePolicy(e.target.value)}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--panel)', fontSize: '0.9rem' }}>
                  <option value="">— Select —</option>
                  {activeIns.map((p, i) => <option key={i} value={p.title}>{p.title}</option>)}
                  {activeIns.length === 0 && <option disabled>No active policies yet</option>}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Nominee full name</span>
                <input type="text" placeholder="e.g. Priya Mehta" value={nomineeName} onChange={e => setNomineeName(e.target.value)}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Relationship</span>
                <input type="text" placeholder="e.g. Spouse, Child, Parent" value={nomineeRel} onChange={e => setNomineeRel(e.target.value)}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem' }} />
              </label>
              <button className="button button--primary" onClick={updateNominee}>Update Nominee</button>
            </div>
          </SectionCard>

          {/* Policy documents */}
          <SectionCard title="Policy Documents" subtitle="Download documents for your active policies. Go to 'My Policies' tab to view details and download certificates, receipts, and claim forms.">
            {activeIns.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>No active policies. Activate a plan first.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeIns.map((p, pi) => {
                  const defP = PLANS.find(pl => pl.title === p.title) || {};
                  const sP = seed(p.title);
                  const pNoP = `NOV-${new Date(p.decidedOn).getFullYear()}-${(sP % 900000 + 100000)}`;
                  return (
                    <div key={pi} style={{ padding: '0.625rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--panel-soft)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>{defP.icon || ''} {p.title} <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>({pNoP})</span></div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
