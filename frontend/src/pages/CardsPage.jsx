import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import WorkflowModal from '../components/WorkflowModal';
import ApplicationFormModal from '../components/ApplicationFormModal';
import { useAuth } from '../context/AuthContext';
import { addProduct, hasProduct, getCategoryProducts, getProductHistory, removeProductHistory } from '../utils/products';
import api from '../services/api';

const CARD_MGMT_KEY = 'nova_card_mgmt';
const ADMIN_CARD_KEY = 'nova_card_admin_mgmt';

function loadMgmt() {
  try { return JSON.parse(localStorage.getItem(CARD_MGMT_KEY) || '{}'); }
  catch { return {}; }
}
function saveMgmt(o) { localStorage.setItem(CARD_MGMT_KEY, JSON.stringify(o)); }

function getMgmt(title) {
  const all = loadMgmt();
  return all[title] || { frozen: false, txnLimit: '' };
}

function setMgmtField(title, field, value) {
  const all = loadMgmt();
  all[title] = { ...getMgmt(title), [field]: value };
  saveMgmt(all);
  return all[title];
}

function getAdminMgmt(title) {
  try { return JSON.parse(localStorage.getItem(ADMIN_CARD_KEY) || '{}')[title] || {}; }
  catch { return {}; }
}

// Deterministic 16-digit card number from title + lastFour
function simulateCardNumber(title, lastFour) {
  let h = 5381;
  for (let i = 0; i < title.length; i++) h = ((h << 5) + h) ^ title.charCodeAt(i);
  h = Math.abs(h);
  const d1 = String(h % 10000).padStart(4, '0');
  const d2 = String(Math.floor(h / 10000) % 10000).padStart(4, '0');
  const d3 = String(Math.floor(h / 100000000) % 10000 || 1234).padStart(4, '0');
  return `${d1} ${d2} ${d3} ${lastFour}`;
}

// Deterministic CVV from lastFour
function simulateCvv(lastFour) {
  const n = parseInt(lastFour, 10) || 1234;
  return String((n * 13 + 7777) % 1000).padStart(3, '0');
}

const CARD_REQ_KEY = 'nova_card_payment_requests';
function loadCardRequests() {
  try { return JSON.parse(localStorage.getItem(CARD_REQ_KEY) || '[]'); }
  catch { return []; }
}
function saveCardRequests(arr) { localStorage.setItem(CARD_REQ_KEY, JSON.stringify(arr)); }

const DUMMY_REQUESTERS = ['Priya Sharma', 'Rohit Mehta', 'Anjali Kapoor', 'Vikram Nair', 'Sneha Patel'];
const DUMMY_DESCS = ['Dinner at Taj', 'Cab fare split', 'Movie tickets', 'Hotel booking', 'Grocery run', 'Flight ticket'];

function createDummyRequest(cardTitle) {
  const requests = loadCardRequests();
  const name = DUMMY_REQUESTERS[Math.floor(Math.random() * DUMMY_REQUESTERS.length)];
  const desc = DUMMY_DESCS[Math.floor(Math.random() * DUMMY_DESCS.length)];
  const amount = (Math.floor(Math.random() * 49) + 1) * 100 + Math.floor(Math.random() * 99);
  const req = {
    id: `cardreq_${Date.now()}`,
    fromName: name,
    amount,
    description: desc,
    cardTitle,
    createdAt: new Date().toISOString(),
    seen: false,
    status: 'PENDING',
  };
  saveCardRequests([req, ...requests]);
  return req;
}

const CARDS = [
  { icon: '', title: 'Nova Platinum Credit Card', type: 'Credit', fee: '₹499/year', variant: 'platinum', lastFour: '4821', features: ['2% cashback on all spends', '4× reward points on dining', 'Complimentary lounge access', 'Fuel surcharge waiver'] },
  { icon: '', title: 'Nova Gold Credit Card', type: 'Credit', fee: '₹999/year', variant: 'gold', lastFour: '7395', features: ['5× reward points on travel', 'Airport lounge unlimited', '₹5L travel insurance', 'Concierge service 24×7'] },
  { icon: '', title: 'Nova Signature Credit Card', type: 'Credit', fee: '₹2,499/year', variant: 'signature', lastFour: '2048', features: ['10× reward points on premium brands', 'Golf program access', '₹1Cr travel insurance', 'Buy 1 Get 1 movie tickets'] },
  { icon: '', title: 'Nova Classic Debit Card', type: 'Debit', fee: 'Free', variant: 'classic', lastFour: '5512', features: ['Free with savings account', 'ATM withdrawals upto 5/month', 'Online shopping enabled', 'Contactless payments'] },
  { icon: '', title: 'Nova Premium Debit Card', type: 'Debit', fee: '₹299/year', variant: 'premium', lastFour: '8867', features: ['Higher daily limits', '1% cashback on tap payments', 'Free international ATM (3/month)', 'Purchase protection cover'] },
  { icon: '', title: 'Nova Travel Card', type: 'Prepaid', fee: '₹199', variant: 'travel', lastFour: '3341', features: ['Multi-currency wallet', 'Zero forex markup', 'Accepted worldwide', 'Lock-in exchange rate'] },
];

export default function CardsPage() {
  const { user } = useAuth();
  const [toast, setToast] = useState({ message: '', type: '' });
  const [, refresh] = useState(0);
  const [workflow, setWorkflow] = useState(null);
  const [appForm, setAppForm] = useState(null);
  const [txnLimitInput, setTxnLimitInput] = useState({});
  const [cvvVisible, setCvvVisible] = useState({});
  const [cardNumVisible, setCardNumVisible] = useState({});
  const [adminState, setAdminState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ADMIN_CARD_KEY) || '{}'); } catch { return {}; }
  });
  // Backend block state — fetched on mount & focus; overrides localStorage
  const [backendBlocks, setBackendBlocks] = useState([]);
  // Helper: get admin management for a card, preferring backend data
  const getCardAdminMgmt = (title) => {
    const remote = backendBlocks.find(b => b.category === 'cards' && b.productTitle === title && b.status === 'APPROVED');
    if (remote) return { adminBlocked: remote.blocked === true, adminFrozen: remote.blocked === true };
    return adminState[`${user?.username}__${title}`] || {};
  };
  const [cardRequests, setCardRequests] = useState(loadCardRequests);
  const [requestPopupDismissed, setRequestPopupDismissed] = useState(false);

  // Refresh admin state and card requests when storage changes (e.g. admin in another tab)
  useEffect(() => {
    const sync = () => {
      try { setAdminState(JSON.parse(localStorage.getItem(ADMIN_CARD_KEY) || '{}')); } catch { /* ignore */ }
      setCardRequests(loadCardRequests());
      // Re-fetch backend blocks so cross-device changes appear
      api.get('/product-requests/my')
        .then(r => setBackendBlocks(r.data?.data || r.data || []))
        .catch(() => {});
    };
    sync(); // read fresh on mount
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const unseenRequests = cardRequests.filter(r => r.status === 'PENDING' && !r.seen);

  const markRequestsSeen = () => {
    const updated = cardRequests.map(r => ({ ...r, seen: true }));
    saveCardRequests(updated);
    setCardRequests(updated);
  };

  const respondRequest = (id, decision) => {
    const updated = cardRequests.map(r => r.id === id ? { ...r, status: decision, seen: true } : r);
    saveCardRequests(updated);
    setCardRequests(updated);
    setToast({ message: decision === 'ACCEPTED' ? 'Payment request accepted.' : 'Payment request declined.', type: decision === 'ACCEPTED' ? 'success' : 'info' });
    // Write a notification so NotificationsPage can pick it up
    const req = cardRequests.find(r => r.id === id);
    if (req) {
      try {
        const notifs = JSON.parse(localStorage.getItem('nova_card_req_decisions') || '[]');
        notifs.unshift({ ...req, status: decision, decidedAt: new Date().toISOString() });
        localStorage.setItem('nova_card_req_decisions', JSON.stringify(notifs.slice(0, 50)));
      } catch { /* ignore */ }
    }
  };

  const simulateRequest = (cardTitle) => {
    createDummyRequest(cardTitle);
    setCardRequests(loadCardRequests());
    setRequestPopupDismissed(false);
    setToast({ message: 'A dummy payment request has been created. Check the Incoming Requests section.', type: 'info' });
  };
  const myCards = getCategoryProducts('cards');
  const cardHistory = getProductHistory().filter(h => h.category === 'cards');
  const approvedCards = cardHistory.filter(h => h.decision === 'APPROVED');

  const getCardStatus = (title) => {
    const historyEntry = cardHistory.find(h => h.title === title);
    if (historyEntry) return historyEntry.decision;
    if (hasProduct('cards', title)) return 'PENDING';
    return null;
  };

  const confirmApply = (card) => {
    // Clear any previous declined history so admin sees a fresh application
    removeProductHistory('cards', card.title);
    addProduct('cards', card.title);
    setToast({ message: `"${card.title}" application submitted! You'll receive your card within 7-10 business days.`, type: 'success' });
    setWorkflow(null);
    refresh(n => n + 1);
  };

  const toggleFreeze = (title) => {
    const adminM = getCardAdminMgmt(title);
    if (adminM.adminFrozen || adminM.adminBlocked) {
      return setToast({ message: 'This card is restricted by the bank. Please contact support.', type: 'error' });
    }
    const cur = getMgmt(title);
    const next = setMgmtField(title, 'frozen', !cur.frozen);
    setToast({ message: `Card "${title}" ${next.frozen ? 'frozen' : 'unfrozen'} successfully.`, type: next.frozen ? 'success' : 'info' });
    refresh(n => n + 1);
  };

  const saveLimit = (title) => {
    const val = txnLimitInput[title];
    if (!val || isNaN(Number(val)) || Number(val) <= 0) return setToast({ message: 'Enter a valid limit amount.', type: 'error' });
    setMgmtField(title, 'txnLimit', val);
    setToast({ message: `Transaction limit set to ₹${Number(val).toLocaleString('en-IN')} for "${title}".`, type: 'success' });
    refresh(n => n + 1);
  };

  return (
    <AppShell role="CUSTOMER" title="Cards" subtitle="Choose from our range of credit, debit, and prepaid cards.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      <WorkflowModal {...(workflow || {})} open={!!workflow} onClose={() => setWorkflow(null)} />
      <ApplicationFormModal
        open={!!appForm}
        onClose={() => setAppForm(null)}
        category="cards"
        productTitle={appForm?.card?.title || ''}
        productIcon={appForm?.card?.icon || ''}
        productSubtitle={appForm ? `${appForm.card.type} Card — Annual fee: ${appForm.card.fee}` : ''}
        onSubmit={(formData) => {
          const c = appForm.card;
          setAppForm(null);
          try { localStorage.setItem(`nova_app_cards_${c.title}`, JSON.stringify({ ...formData, appliedOn: new Date().toISOString() })); } catch {}
          setWorkflow({ icon: c.icon, title: `Apply for ${c.title}`, subtitle: `${c.type} Card — Annual fee: ${c.fee}`, details: [['Card type', c.type], ['Annual fee', c.fee], ['Income', `₹${Number(formData.annualIncome || 0).toLocaleString('en-IN')}/yr`], ['Employment', formData.employmentType || '—']], steps: ['Application submitted', 'Income & credit verification', 'Card printed and dispatched', 'Activate via SMS/app (7–10 days)'], confirmLabel: 'Apply for Card', onConfirm: () => confirmApply(c) });
        }}
      />

      {/* ── INCOMING PAYMENT REQUEST POPUP BANNER ── */}
      {unseenRequests.length > 0 && !requestPopupDismissed && (
        <div style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: '#fffbeb', border: '1.5px solid #fcd34d', marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ fontSize: '1.5rem', flexShrink: 0 }}></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#92400e' }}>
              {unseenRequests.length} new card payment request{unseenRequests.length > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: '0.83rem', color: '#78350f', marginTop: '0.2rem' }}>
              {unseenRequests[0].fromName} is requesting <strong>₹{Number(unseenRequests[0].amount).toLocaleString('en-IN')}</strong> for "{unseenRequests[0].description}" on your <em>{unseenRequests[0].cardTitle}</em>.
              {unseenRequests.length > 1 ? ` (+${unseenRequests.length - 1} more)` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button className="button button--sm button--primary" style={{ fontSize: '0.78rem' }}
              onClick={() => { markRequestsSeen(); setRequestPopupDismissed(true); }}>
              View below ↓
            </button>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#92400e', padding: '0.2rem 0.3rem' }}
              onClick={() => setRequestPopupDismissed(true)}>✕</button>
          </div>
        </div>
      )}

      <div className="showcase-hero showcase-hero--cards">
        <div className="showcase-hero__stat">
          <span className="showcase-hero__label">Credit cards</span>
          <span className="showcase-hero__value">{CARDS.filter(c => c.type === 'Credit').length}</span>
        </div>
        <div className="showcase-hero__stat">
          <span className="showcase-hero__label">My cards</span>
          <span className="showcase-hero__value">{myCards.length + approvedCards.length}</span>
        </div>
        <div className="showcase-hero__stat">
          <span className="showcase-hero__label">Best cashback</span>
          <span className="showcase-hero__value">Up to 5%</span>
        </div>
      </div>

      {(myCards.length > 0 || cardHistory.length > 0) && (
        <SectionCard title="My cards" subtitle={`${myCards.length + cardHistory.length} card application(s) on record.`}>
          <div className="my-products-strip">
            {myCards.map((p, i) => <span key={i} className="my-product-chip">⏳ {p.title} — <em>Pending admin approval</em></span>)}
            {cardHistory.map((h, i) => (
              <span key={`h-${i}`} className={`my-product-chip my-product-chip--${h.decision === 'APPROVED' ? 'approved' : 'declined'}`}>
                {h.decision === 'APPROVED' ? '✅' : '❌'} {h.title} — <em>{h.decision === 'APPROVED' ? 'Approved — card being dispatched' : 'Declined'}</em>
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── MANAGE APPROVED CARDS ── */}
      {approvedCards.length > 0 && (
        <SectionCard title="Manage my cards" subtitle="Freeze/unfreeze, set transaction limits, or view PIN for your active cards.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {approvedCards.map(h => {
              const card = CARDS.find(c => c.title === h.title) || {};
              const mgmt = getMgmt(h.title);
    const adminM = getCardAdminMgmt(h.title);
              const isAdminFrozen = !!adminM.adminFrozen;
              const isAdminBlocked = !!adminM.adminBlocked;
              const isRestricted = isAdminFrozen || isAdminBlocked;
              const borderColor = isAdminBlocked ? '#7c3aed' : isAdminFrozen ? '#f97316' : 'var(--line)';
              const bgColor = isAdminBlocked ? '#faf5ff' : isAdminFrozen ? '#fff7ed' : 'var(--panel)';
              return (
                <div key={h.title} style={{ padding: '1rem 1.25rem', borderRadius: '12px', border: `1.5px solid ${borderColor}`, background: bgColor, display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '2rem', flexShrink: 0 }}>{card.icon || '💳'}</div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{h.title}</span>
                      {isAdminBlocked
                        ? <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#faf5ff', color: '#7c3aed', border: '1px solid #c4b5fd', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>🚫 BLOCKED BY BANK</span>
                        : isAdminFrozen
                          ? <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>🔒 FROZEN BY BANK</span>
                          : mgmt.frozen
                            ? <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#f1f5f9', color: '#1e3a5f', border: '1px solid #94a3b8', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>❄️ FROZEN BY YOU</span>
                            : <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>✅ ACTIVE</span>
                      }
                    </div>

                    {/* Card number */}
                    <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Card No:</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.12em', background: 'var(--panel-soft)', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
                        {cardNumVisible[h.title] ? simulateCardNumber(h.title, card.lastFour || '****') : `•••• •••• •••• ${card.lastFour || '****'}`}
                      </span>
                      <button className="button button--ghost button--sm" style={{ fontSize: '0.75rem' }} onClick={() => setCardNumVisible(p => ({ ...p, [h.title]: !p[h.title] }))}>
                        {cardNumVisible[h.title] ? 'Hide' : 'Show'}
                      </button>
                    </div>

                    {/* CVV */}
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>CVV:</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.15em', background: 'var(--panel-soft)', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid var(--line)', color: cvvVisible[h.title] ? 'var(--primary)' : 'transparent', textShadow: cvvVisible[h.title] ? 'none' : '0 0 8px var(--text)', transition: 'color 0.2s, text-shadow 0.2s' }}>
                        {simulateCvv(card.lastFour)}
                      </span>
                      <button className="button button--ghost button--sm" style={{ fontSize: '0.75rem' }} onClick={() => setCvvVisible(p => ({ ...p, [h.title]: !p[h.title] }))}>
                        {cvvVisible[h.title] ? 'Hide CVV' : 'View CVV'}
                      </button>
                    </div>

                    {/* Transaction limit */}
                    <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Daily limit:</span>
                      <input type="text" inputMode="numeric" maxLength={7} min="100" placeholder={mgmt.txnLimit || 'e.g. 50000'}
                        value={txnLimitInput[h.title] !== undefined ? txnLimitInput[h.title] : (mgmt.txnLimit || '')}
                        onChange={e => setTxnLimitInput(p => ({ ...p, [h.title]: e.target.value.replace(/\D/g, '') }))}
                        disabled={isRestricted}
                        style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '0.85rem', width: '120px', opacity: isRestricted ? 0.5 : 1 }} />
                      <button className="button button--sm button--primary" style={{ fontSize: '0.75rem' }} onClick={() => saveLimit(h.title)} disabled={isRestricted}>Set limit</button>
                    </div>

                    {isRestricted && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: isAdminBlocked ? '#7c3aed' : '#c2410c', fontWeight: 500 }}>
                        {isAdminBlocked ? '🚫 Card blocked by bank. Contact customer support.' : '🔒 Card frozen by bank. Contact customer support to resolve.'}
                      </div>
                    )}

                    {/* Freeze / Unfreeze */}
                    {!isAdminBlocked && !isAdminFrozen && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <button
                          className={`button button--sm ${mgmt.frozen ? 'button--secondary' : 'button--ghost'}`}
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => toggleFreeze(h.title)}
                        >
                          {mgmt.frozen ? '🔓 Unfreeze Card' : '❄️ Freeze Card'}
                        </button>
                      </div>
                    )}
                  </div>


                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      <div className="showcase-grid">
        {CARDS.map((card, i) => {
          const status = getCardStatus(card.title);
          const adminM = getCardAdminMgmt(card.title);
          const custM = getMgmt(card.title);
          const cardBlocked = status === 'APPROVED' && !!adminM.adminBlocked;
          const cardAdminFrozen = status === 'APPROVED' && !!adminM.adminFrozen && !cardBlocked;
          const cardSelfFrozen = status === 'APPROVED' && !cardBlocked && !cardAdminFrozen && !!custM.frozen;
          return (
            <div key={i} style={{ background: 'var(--panel)', borderRadius: '18px', boxShadow: 'var(--shadow)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
              {/* Card visual — full width, top */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div className={`card-visual card-visual--${card.variant}`} style={{ margin: 0, borderRadius: '18px 18px 0 0', opacity: (cardBlocked || cardAdminFrozen || cardSelfFrozen) ? 0.6 : 1, filter: (cardBlocked || cardAdminFrozen || cardSelfFrozen) ? 'grayscale(0.4)' : 'none' }}>
                  <div className="card-visual__top">
                    <div className="card-visual__chip" />
                    <span className="card-visual__brand">Nova Bank</span>
                  </div>
                  <div className="card-visual__number">•••• •••• •••• {card.lastFour}</div>
                  <div className="card-visual__bottom">
                    <span className="card-visual__name">{card.title.replace('Nova ', '')}</span>
                    <span className="card-visual__type">{card.type}</span>
                  </div>
                </div>
                {cardBlocked && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '18px 18px 0 0', background: 'rgba(124,58,237,0.18)', backdropFilter: 'blur(1px)' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#7c3aed', letterSpacing: '2px', background: 'rgba(250,245,255,0.9)', padding: '0.3rem 0.9rem', borderRadius: '8px', border: '2px solid #c4b5fd' }}>🚫 BLOCKED</span>
                  </div>
                )}
                {cardAdminFrozen && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '18px 18px 0 0', background: 'rgba(249,115,22,0.15)', backdropFilter: 'blur(1px)' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#c2410c', letterSpacing: '2px', background: 'rgba(255,247,237,0.92)', padding: '0.3rem 0.9rem', borderRadius: '8px', border: '2px solid #fdba74' }}>🔒 FROZEN BY BANK</span>
                  </div>
                )}
                {cardSelfFrozen && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '18px 18px 0 0', background: 'rgba(100,116,139,0.18)', backdropFilter: 'blur(1px)' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1e3a5f', letterSpacing: '2px', background: 'rgba(248,250,252,0.93)', padding: '0.3rem 0.9rem', borderRadius: '8px', border: '2px solid #94a3b8' }}>❄️ FROZEN BY YOU</span>
                  </div>
                )}
              </div>

              {/* Text content below visual */}
              <div style={{ padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{card.icon} {card.title}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{card.type} Card — {card.fee}</div>
                </div>
                <ul className="showcase-features" style={{ margin: 0, paddingLeft: '1.1rem' }}>
                  {card.features.map((f, j) => <li key={j}>{f}</li>)}
                </ul>
                {status === 'APPROVED' && <span className="badge badge--success">✅ Approved — Card dispatched</span>}
                {status === 'DECLINED' && <span className="badge badge--error">❌ Declined</span>}
                {status === 'PENDING' && <span className="badge badge--warning">⏳ Pending Approval</span>}
                {(!status || status === 'DECLINED') && (
                  <button className="button button--sm button--primary" style={{ alignSelf: 'flex-start' }} onClick={() => setAppForm({ card })}>{status === 'DECLINED' ? 'Re-apply' : 'Apply Now'}</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
