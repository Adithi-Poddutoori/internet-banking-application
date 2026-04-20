import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import WorkflowModal from '../components/WorkflowModal';
import { addProduct, getCategoryProducts } from '../utils/products';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const REWARDS = [
  { id: 1, icon: '🎁', title: 'Welcome Bonus', desc: 'Earn 500 reward points on opening a new savings account.', points: 500, status: 'claimed' },
  { id: 2, icon: '💳', title: 'First Transaction', desc: 'Complete your first fund transfer and earn 100 points.', points: 100, status: 'claimed' },
  { id: 3, icon: '📱', title: 'Digital Banking', desc: 'Use Internet Banking for 30 consecutive days.', points: 250, status: 'in-progress' },
  { id: 4, icon: '🔄', title: 'Bill Pay Pro', desc: 'Set up 3 auto-pay mandates for recurring bills.', points: 200, status: 'available' },
  { id: 6, icon: '🛡️', title: 'Security Champion', desc: 'Enable two-factor authentication on your account.', points: 150, status: 'available' },
];

const STATUS_LABEL = { claimed: 'Claimed', 'in-progress': 'In Progress', started: 'Started', available: 'Available' };
const STATUS_CLASS = { claimed: 'badge badge--success', 'in-progress': 'badge badge--warning', started: 'badge badge--warning', available: 'badge badge--info' };

export default function RewardsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('rewards');
  const [toast, setToast] = useState({ message: '', type: '' });
  const [redemptionHistory, setRedemptionHistory] = useState([]);
  const [redeemedPts, setRedeemedPts] = useState(0);
  const [workflow, setWorkflow] = useState(null);
  const [redeemMode, setRedeemMode] = useState('cashback');
  const [redeemPoints, setRedeemPoints] = useState('');
  const [voucherBrand, setVoucherBrand] = useState('Amazon');
  const [voucherCode, setVoucherCode] = useState(null);
  const myRewardStarts = getCategoryProducts('rewards');

  const loadRedemptionData = () => {
    api.get('/reward-redemptions/my').then(r => setRedemptionHistory(r.data?.data || [])).catch(() => {});
    api.get('/reward-redemptions/my/total-points').then(r => setRedeemedPts(r.data?.data || 0)).catch(() => {});
  };

  useEffect(() => {
    loadRedemptionData();
  }, []);

  const getRewardStatus = (r) => {
    if (r.status === 'claimed' || r.status === 'in-progress') return r.status;
    if (myRewardStarts.some(p => p.title === r.title)) return 'started';
    return 'available';
  };

  const earnedPoints = REWARDS.filter(r => r.status === 'claimed').reduce((s, r) => s + r.points, 0)
    + myRewardStarts.length * 50;
  const totalPoints = Math.max(0, earnedPoints - redeemedPts);

  const TIERS = [
    { name: 'Bronze', min: 0, max: 500, color: '#cd7f32' },
    { name: 'Silver', min: 500, max: 1500, color: '#6b7280' },
    { name: 'Gold', min: 1500, max: 3000, color: '#d97706' },
    { name: 'Platinum', min: 3000, max: Infinity, color: '#6d28d9' },
  ];
  const currentTier = TIERS.find(t => totalPoints >= t.min && totalPoints < t.max) || TIERS[0];
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1];
  const tierProgress = nextTier ? Math.min(100, ((totalPoints - currentTier.min) / (nextTier.min - currentTier.min)) * 100) : 100;

  const VOUCHER_BRANDS = ['Amazon', 'Flipkart', 'Myntra', 'Zomato', 'Swiggy', 'BookMyShow'];
  const MIN_REDEEM = 100;

  const confirmRedeem = (reward) => {
    addProduct('rewards', reward.title);
    setToast({ message: `"${reward.title}" challenge started! Complete the steps to earn ${reward.points} points.`, type: 'success' });
    setWorkflow(null);
    refresh(n => n + 1);
  };

  const submitRedeem = () => {
    const pts = parseInt(redeemPoints);
    if (!pts || pts < MIN_REDEEM) return setToast({ message: `Minimum redemption is ${MIN_REDEEM} points.`, type: 'error' });
    if (pts > totalPoints) return setToast({ message: `You only have ${totalPoints} points.`, type: 'error' });

    if (redeemMode === 'cashback') {
      const amount = (pts * 0.25).toFixed(2);
      api.post('/reward-redemptions', { mode: 'cashback', points: pts, value: parseFloat(amount) })
        .then(r => {
          setRedemptionHistory(h => [r.data.data, ...h]);
          setRedeemedPts(p => p + pts);
          setToast({ message: `₹${amount} cashback credited to your primary account for ${pts} points.`, type: 'success' });
          setVoucherCode(null);
        }).catch(e => setToast({ message: e.response?.data?.message || 'Redemption failed.', type: 'error' }));
    } else {
      const code = `${voucherBrand.substring(0, 3).toUpperCase()}-${(pts * 17 + 3131).toString().slice(-4)}-${Date.now().toString().slice(-4)}`;
      const val = (pts * 0.25).toFixed(0);
      api.post('/reward-redemptions', { mode: 'voucher', points: pts, value: parseFloat(val), brand: voucherBrand, voucherCode: code })
        .then(r => {
          setRedemptionHistory(h => [r.data.data, ...h]);
          setRedeemedPts(p => p + pts);
          setVoucherCode({ brand: voucherBrand, code, value: val, pts });
          setToast({ message: `Voucher generated! Copy the code below.`, type: 'success' });
        }).catch(e => setToast({ message: e.response?.data?.message || 'Redemption failed.', type: 'error' }));
    }
    setRedeemPoints('');
  };

  return (
    <AppShell role="CUSTOMER" title="Rewards" subtitle="Earn reward points and redeem them for cashback and vouchers.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      <WorkflowModal {...(workflow || {})} open={!!workflow} onClose={() => setWorkflow(null)} />

      <div className="showcase-hero showcase-hero--rewards">
        <div className="showcase-hero__stat"><span className="showcase-hero__label">Available points</span><span className="showcase-hero__value">{totalPoints.toLocaleString('en-IN')}</span></div>
        <div className="showcase-hero__stat"><span className="showcase-hero__label">Points value</span><span className="showcase-hero__value">₹{(totalPoints * 0.25).toFixed(0)}</span></div>
        <div className="showcase-hero__stat"><span className="showcase-hero__label">Earned total</span><span className="showcase-hero__value">{earnedPoints.toLocaleString('en-IN')}</span></div>
        <div className="showcase-hero__stat"><span className="showcase-hero__label">Tier</span><span className="showcase-hero__value" style={{ color: currentTier.color }}>{currentTier.name}</span></div>
      </div>

      {/* Tier progress bar */}
      <div style={{ padding: '0.875rem 1rem', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '12px', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <span style={{ fontWeight: 700, color: currentTier.color, fontSize: '0.9rem' }}>{currentTier.name}</span>
          {nextTier && <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{Math.max(0, nextTier.min - totalPoints)} pts to {nextTier.name}</span>}
        </div>
        <div style={{ height: '8px', borderRadius: '99px', background: 'var(--line)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '99px', background: currentTier.color, width: `${tierProgress}%`, transition: 'width 0.4s' }} />
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          {TIERS.map(t => <span key={t.name} style={{ fontSize: '0.72rem', fontWeight: totalPoints >= t.min ? 700 : 400, color: totalPoints >= t.min ? t.color : 'var(--muted)' }}>{t.name}</span>)}
        </div>
      </div>

      <div className="tab-bar">
        <button className={`tab-bar__tab${tab === 'rewards' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('rewards')}>Rewards</button>
        <button className={`tab-bar__tab${tab === 'redeem' ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab('redeem')}>Redeem</button>
      </div>

      {tab === 'rewards' && (
        <div className="showcase-grid">
          {REWARDS.map(r => {
            const status = getRewardStatus(r);
            return (
              <div className="showcase-card" key={r.id}>
                <div className="showcase-card__icon">{r.icon}</div>
                <div className="showcase-card__body">
                  <div className="showcase-card__header">
                    <strong>{r.title}</strong>
                    <span className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</span>
                  </div>
                  <p>{r.desc}</p>
                  <div className="showcase-card__footer">
                    <span className="showcase-card__points">+{r.points} pts</span>
                    {status === 'available' && <button className="button button--sm button--primary" onClick={() => setWorkflow({
                      icon: r.icon, title: `Start "${r.title}"`, subtitle: r.desc,
                      details: [['Reward', `${r.points} pts`], ['Value', `₹${(r.points * 0.25).toFixed(0)}`]],
                      steps: ['Read challenge requirements', 'Complete the required actions', 'Points credited automatically'],
                      confirmLabel: 'Start Challenge', onConfirm: () => confirmRedeem(r)
                    })}>Start</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'redeem' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          <SectionCard title="Redeem Points" subtitle={`Available: ${totalPoints} points (₹${(totalPoints * 0.25).toFixed(0)} value).`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[['cashback', 'Cashback'], ['voucher', 'Voucher']].map(([m, label]) => (
                  <button key={m} onClick={() => setRedeemMode(m)}
                    style={{ flex: 1, padding: '0.4rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', border: `2px solid ${redeemMode === m ? 'var(--primary)' : 'var(--line)'}`, background: redeemMode === m ? 'var(--primary-tint, #eff6ff)' : 'var(--panel-soft)', color: redeemMode === m ? 'var(--primary)' : 'var(--muted)' }}>
                    {label}
                  </button>
                ))}
              </div>
              {redeemMode === 'voucher' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Brand</span>
                  <select value={voucherBrand} onChange={e => setVoucherBrand(e.target.value)}
                    style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--panel)', fontSize: '0.9rem' }}>
                    {VOUCHER_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </label>
              )}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Points to redeem (min {MIN_REDEEM})</span>
                <input type="number" min={MIN_REDEEM} max={totalPoints} placeholder={`e.g. ${MIN_REDEEM}`} value={redeemPoints} onChange={e => setRedeemPoints(e.target.value)}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.95rem' }} />
              </label>
              {redeemPoints >= MIN_REDEEM && <div style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>= ₹{(Number(redeemPoints) * 0.25).toFixed(2)} {redeemMode === 'cashback' ? 'cashback' : `${voucherBrand} voucher`}</div>}
              <button className="button button--primary" onClick={submitRedeem}>Redeem Now</button>
              {voucherCode && redeemMode === 'voucher' && (
                <div style={{ padding: '0.875rem', borderRadius: '10px', background: '#f0fdf4', border: '2px solid #16a34a', marginTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>🎁 {voucherCode.brand} Voucher — worth ₹{voucherCode.value}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.12em', color: '#16a34a', marginBottom: '0.5rem' }}>{voucherCode.code}</div>
                  <button className="button button--sm button--ghost" onClick={() => { navigator.clipboard?.writeText(voucherCode.code); setToast({ message: 'Voucher code copied!', type: 'success' }); }}>📋 Copy Code</button>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.4rem' }}>Redeem at {voucherCode.brand}'s website or app. Valid for 90 days.</div>
                </div>
              )}
            </div>
          </SectionCard>
          <SectionCard title="Redemption history" subtitle={`${redemptionHistory.length} redemption(s).`}>
            {redemptionHistory.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No redemptions yet. Redeem your first points above!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto' }}>
                {redemptionHistory.map((r, i) => (
                  <div key={r.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', borderRadius: '10px', background: '#f8fbff', border: '1px solid var(--line)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.mode === 'cashback' ? '💸' : '🎁'} {r.mode === 'cashback' ? `₹${(r.value * 1).toFixed(2)} cashback` : `${r.brand || ''} voucher ₹${r.value}`}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.15rem' }}>{new Date(r.redeemedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.875rem' }}>−{r.points} pts</div>
                      <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>₹{r.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

    </AppShell>
  );
}

