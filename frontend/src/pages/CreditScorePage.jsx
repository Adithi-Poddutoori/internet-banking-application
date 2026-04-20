import { useState, useEffect, useMemo } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import api from '../services/api';
import { getProductHistory } from '../utils/products';

function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

function CreditMeter({ score, minScore = 300, maxScore = 900, sourceLabel }) {
  const [displayPct, setDisplayPct] = useState(0);
  const targetPct = ((score - minScore) / (maxScore - minScore)) * 100;
  const color = score >= 750 ? '#16a34a' : score >= 700 ? '#65a30d' : score >= 650 ? '#d97706' : score >= 600 ? '#f97316' : '#e11d48';
  const label = score >= 750 ? 'Excellent' : score >= 700 ? 'Good' : score >= 650 ? 'Fair' : score >= 600 ? 'Average' : 'Poor';

  useEffect(() => {
    const id = requestAnimationFrame(() => setDisplayPct(targetPct));
    return () => cancelAnimationFrame(id);
  }, [targetPct]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1.5rem 0' }}>
      <div style={{ position: 'relative', width: '160px', height: '80px' }}>
        <svg width="160" height="80" viewBox="0 0 160 80">
          <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke="var(--line)" strokeWidth="14" strokeLinecap="round" />
          <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${displayPct * 2.2} 220`} style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(0.4,0,0.2,1)' }} />
        </svg>
        <div style={{ position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color }}>{label}</div>
        </div>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{sourceLabel || `Scale: ${minScore} – ${maxScore}`}</div>
    </div>
  );
}

export default function CreditScorePage() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Loan eligibility form
  const [incomeForm, setIncomeForm] = useState({ monthlyIncome: '', existingEmi: '', loanType: 'personal', tenure: '36' });
  const [eligResult, setEligResult] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [d, t] = await Promise.all([api.get('/customers/dashboard'), api.get('/transactions')]);
        setAccounts(d.data?.data?.accounts || []);
        setTransactions(t.data?.data || []);
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    load();
  }, []);

  // Simulated credit score derived from account & transaction data
  const creditScore = useMemo(() => {
    let score = 600; // base

    // More accounts = slightly better
    score += Math.min(accounts.length * 10, 30);

    // Total balance contributes
    const totalBal = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
    if (totalBal >= 100000) score += 50;
    else if (totalBal >= 25000) score += 30;
    else if (totalBal >= 5000)  score += 15;

    // Loan history
    const loanHistory = getProductHistory().filter(h => h.category === 'loans');
    const approvedLoans = loanHistory.filter(h => h.decision === 'APPROVED').length;
    const declinedLoans = loanHistory.filter(h => h.decision === 'DECLINED').length;
    score += approvedLoans * 15;
    score -= declinedLoans * 20;

    // Transaction activity
    const debitTxns = transactions.filter(t => ['WITHDRAWAL','TRANSFER_OUT','NEFT','IMPS','RTGS'].includes(t.transactionType));
    const creditTxns = transactions.filter(t => ['DEPOSIT','TRANSFER_IN','INTEREST_CREDIT'].includes(t.transactionType));
    score += Math.min(creditTxns.length * 2, 40);
    if (debitTxns.length > creditTxns.length * 2) score -= 20; // spending > income

    return Math.min(900, Math.max(300, score));
  }, [accounts, transactions]);

  const factors = [
    { label: 'Account history', score: accounts.length > 0 ? 'Good' : 'Fair', color: '#16a34a', detail: `${accounts.length} active account(s)` },
    { label: 'Repayment record', score: 'Good', color: '#16a34a', detail: 'No missed payments on record' },
    { label: 'Credit utilization', score: creditScore >= 700 ? 'Low' : 'Medium', color: creditScore >= 700 ? '#16a34a' : '#d97706', detail: 'Based on your transaction patterns' },
    { label: 'Credit age', score: 'Fair', color: '#d97706', detail: 'Account age affects this score' },
    { label: 'Enquiries', score: 'Good', color: '#16a34a', detail: 'No hard enquiries detected' },
  ];

  const RATES = { personal: 10.5, home: 8.5, car: 9.25, education: 7.5, business: 11 };
  const LOAN_LABELS = { personal: 'Personal Loan', home: 'Home Loan', car: 'Car Loan', education: 'Education Loan', business: 'Business Loan' };

  const checkEligibility = () => {
    const income = Number(incomeForm.monthlyIncome);
    const emi = Number(incomeForm.existingEmi) || 0;
    const tenure = Number(incomeForm.tenure);
    if (!income || income <= 0) return;
    const disposable = income - emi;
    const maxEmi = disposable * 0.5;
    const rate = RATES[incomeForm.loanType] / 100 / 12;
    const eligible = rate > 0
      ? maxEmi * ((Math.pow(1 + rate, tenure) - 1) / (rate * Math.pow(1 + rate, tenure)))
      : maxEmi * tenure;
    const creditAdj = creditScore >= 750 ? 1.2 : creditScore >= 700 ? 1.0 : creditScore >= 650 ? 0.85 : 0.7;
    setEligResult({
      amount: Math.round(eligible * creditAdj),
      emi: Math.round(maxEmi * creditAdj),
      rate: RATES[incomeForm.loanType],
      tenure,
      loanType: LOAN_LABELS[incomeForm.loanType],
      creditAdj,
    });
  };

  return (
    <AppShell role="CUSTOMER" title="Credit Score & Loan Eligibility" subtitle="Understand your credit health and check loan eligibility.">

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Credit score card */}
        <SectionCard title="Nova Credit Score" subtitle="Your internal bank score based on Nova Bank account activity.">
          {loading ? <div className="empty-state">Calculating…</div> : (
            <>
              <CreditMeter score={creditScore} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                {factors.map(f => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'var(--panel-soft)', border: '1px solid var(--line)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{f.label}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{f.detail}</div>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: f.color }}>{f.score}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5, padding: '0.75rem', background: 'var(--panel-soft)', borderRadius: '8px' }}>
                ℹ️ This is Nova Bank’s internal score calculated from your banking activity with us. It is separate from and independent of your CIBIL bureau score.
              </div>
            </>
          )}
        </SectionCard>

        {/* CIBIL Bureau Score */}
        {(() => {
          function seedHash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0; return Math.abs(h); }
          const user = (() => { try { return JSON.parse(localStorage.getItem('nova-bank-auth') || '{}'); } catch { return {}; } })();
          const base = 680;
          const jitter = user?.username ? (seedHash(user.username) % 80) : 30;
          const cibilScore = Math.min(900, base + jitter);
          return (
            <SectionCard title="CIBIL Bureau Score" subtitle="Fetched from CIBIL TransUnion — external credit bureau score.">
              <CreditMeter score={cibilScore} sourceLabel="Scale: 300 – 900 · Source: CIBIL TransUnion" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[['Payment History', 'On Time', '#16a34a'], ['Credit Mix', 'Moderate', '#d97706'], ['Credit Age', cibilScore >= 720 ? 'Good' : 'Fair', cibilScore >= 720 ? '#16a34a' : '#d97706'], ['Enquiries', 'Low', '#16a34a'], ['Outstanding Debt', cibilScore >= 740 ? 'Low' : 'Medium', cibilScore >= 740 ? '#16a34a' : '#d97706']].map(([lbl, val, col]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.75rem', borderRadius: '8px', background: 'var(--panel-soft)', border: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{lbl}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: col }}>{val}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5, padding: '0.75rem', background: 'var(--panel-soft)', borderRadius: '8px' }}>
                ⚠️ This is a simulated CIBIL score for demonstration. For your actual official report, visit <strong>cibil.com</strong> or contact CIBIL TransUnion.
              </div>
            </SectionCard>
          );
        })()}

        {/* Score range guide */}
        <SectionCard title="Score guide" subtitle="What your score means for loan approvals.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { range: '750 – 900', label: 'Excellent', color: '#16a34a', desc: 'Best rates, quick approval, maximum loan amount' },
              { range: '700 – 749', label: 'Good',      color: '#65a30d', desc: 'Good rates, standard processing' },
              { range: '650 – 699', label: 'Fair',      color: '#d97706', desc: 'Average rates, may require collateral' },
              { range: '600 – 649', label: 'Average',   color: '#f97316', desc: 'Higher interest, stricter scrutiny' },
              { range: '300 – 599', label: 'Poor',      color: '#e11d48', desc: 'Loan likely declined, work on improving' },
            ].map(s => (
              <div key={s.range} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.6rem 0.75rem', borderRadius: '8px', border: `1.5px solid ${creditScore >= parseInt(s.range) ? s.color + '55' : 'var(--line)'}`, background: 'var(--panel-soft)' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: s.color }}>{s.label} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>({s.range})</span></div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Loan eligibility calculator */}
      <SectionCard title="Loan eligibility checker" subtitle="Get an instant estimate of your loan eligibility.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {[
              { label: 'Monthly income (₹)', key: 'monthlyIncome', type: 'number', placeholder: 'e.g. 50000' },
              { label: 'Existing EMIs per month (₹)', key: 'existingEmi', type: 'number', placeholder: 'e.g. 5000 (0 if none)' },
            ].map(f => (
              <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{f.label}</span>
                <input type={f.type} placeholder={f.placeholder} value={incomeForm[f.key]}
                  onChange={e => setIncomeForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem' }} />
              </label>
            ))}
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Loan type</span>
              <select value={incomeForm.loanType} onChange={e => setIncomeForm(p => ({ ...p, loanType: e.target.value }))}
                style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel)' }}>
                {Object.entries(LOAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Tenure (months)</span>
              <select value={incomeForm.tenure} onChange={e => setIncomeForm(p => ({ ...p, tenure: e.target.value }))}
                style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel)' }}>
                {[12, 24, 36, 48, 60, 84, 120, 180, 240, 360].map(t => <option key={t} value={t}>{t} months ({(t/12).toFixed(1)} yrs)</option>)}
              </select>
            </label>
            <button className="button button--primary" onClick={checkEligibility}>Check Eligibility</button>
          </div>

          {eligResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '1.25rem', borderRadius: '14px', background: 'linear-gradient(135deg, var(--primary) 0%, #1e6fa8 100%)', color: '#fff' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Maximum eligible loan</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '0.2rem' }}>{fmt(eligResult.amount)}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>for {eligResult.loanType}</div>
              </div>
              {[
                ['Interest rate', `${eligResult.rate}% p.a.`],
                ['Tenure', `${eligResult.tenure} months`],
                ['Approx max EMI', fmt(eligResult.emi) + '/mo'],
                ['Credit adjustment', eligResult.creditAdj >= 1 ? '✅ Positive (score ≥ 700)' : '⚠️ Reduced due to score'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.75rem', borderRadius: '8px', background: 'var(--panel-soft)', border: '1px solid var(--line)', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{l}</span>
                  <span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                This is an estimate based on your income, EMIs, and credit score. Final loan amount is subject to bank's credit assessment.
              </div>
            </div>
          ) : (
            <div>
              
            </div>
          )}
        </div>
      </SectionCard>
    </AppShell>
  );
}
