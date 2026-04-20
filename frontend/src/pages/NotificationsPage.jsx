import { useEffect, useState, useMemo } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import api from '../services/api';
import { detectFraud } from '../utils/fraudDetector';

const LOW_BALANCE_THRESHOLD = 1000;

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const SEVERITY_META = {
  high:   { bg: '#fef2f2', border: '#fca5a5', icon: '🚨', badge: '#e11d48' },
  medium: { bg: '#fffbeb', border: '#fcd34d', icon: '⚠️',  badge: '#d97706' },
  low:    { bg: '#eff6ff', border: '#bfdbfe', icon: 'ℹ️',  badge: '#2563eb' },
  info:   { bg: 'var(--panel)', border: 'var(--line)', icon: '🔔', badge: 'var(--primary)' },
};

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [terminationNoticeDate, setTerminationNoticeDate] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nova_notif_dismissed') || '[]'); }
    catch { return []; }
  });
  const [search, setSearch] = useState('');

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem('nova_notif_dismissed', JSON.stringify(next));
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [profRes, dashRes, txRes, cmpRes] = await Promise.allSettled([
          api.get('/customers/me'),
          api.get('/customers/dashboard'),
          api.get('/transactions'),
          api.get('/complaints/my'),
        ]);
        if (profRes.status === 'fulfilled') {
          const d = profRes.value.data?.data?.terminationNoticeDate;
          if (d) setTerminationNoticeDate(new Date(d));
        }
        if (dashRes.status === 'fulfilled') setAccounts(dashRes.value.data?.data?.accounts || []);
        if (txRes.status === 'fulfilled')   setTransactions(txRes.value.data?.data || []);
        if (cmpRes.status === 'fulfilled')  setComplaints(cmpRes.value.data?.data || []);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const notifications = useMemo(() => {
    const notifs = [];

    // Termination notice
    if (terminationNoticeDate) {
      const maxDate = new Date(terminationNoticeDate); maxDate.setDate(maxDate.getDate() + 21);
      const minDate = new Date(terminationNoticeDate); minDate.setDate(minDate.getDate() + 14);
      const daysLeft = Math.max(0, Math.ceil((maxDate - new Date()) / 86400000));
      const fmt = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      notifs.push({ id: 'termination_notice', type: 'TERMINATION', severity: 'high',
        title: 'Account Inactivity Notice',
        message: `Your account has been flagged as inactive. It will be closed between ${fmt(minDate)} and ${fmt(maxDate)} (${daysLeft} days remaining) unless you make a transaction.`,
        time: terminationNoticeDate.toISOString(),
      });
    }

    // Low balance
    for (const acc of accounts) {
      if (Number(acc.balance) < LOW_BALANCE_THRESHOLD) {
        notifs.push({ id: `low_balance_${acc.accountNumber}`, type: 'LOW_BALANCE', severity: 'medium',
          title: 'Low balance alert',
          message: `Account ${acc.accountNumber} (${acc.accountType}) balance: ₹${Number(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} — below ₹1,000. Consider topping up.`,
          time: new Date().toISOString(),
        });
      }
    }

    // Fraud / suspicious alerts
    for (const fa of detectFraud(transactions)) {
      notifs.push({ id: `fraud_${fa.id}`, type: 'SUSPICIOUS', severity: fa.severity,
        title: fa.title, message: fa.message, time: new Date().toISOString(),
      });
    }

    // Bill due reminders
    try {
      const bills = JSON.parse(localStorage.getItem('nova_bills') || '[]');
      for (const b of bills) {
        const isDue = !b.lastPaid || (() => {
          const days = (Date.now() - new Date(b.lastPaid)) / 86400000;
          if (b.frequency === 'monthly')   return days >= 28;
          if (b.frequency === 'quarterly') return days >= 85;
          if (b.frequency === 'yearly')    return days >= 360;
          return false;
        })();
        if (isDue) {
          notifs.push({ id: `bill_due_${b.id}`, type: 'BILL_DUE', severity: 'medium',
            title: `Bill due: ${b.nickname}`,
            message: `${b.nickname} — ₹${Number(b.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} due. ${b.autopay ? 'Autopay is ON.' : 'Go to Bills & Subscriptions to pay.'}`,
            time: new Date().toISOString(),
          });
        }
      }
    } catch { /* ignore */ }

    // Complaint status updates
    for (const c of complaints) {
      notifs.push({ id: `complaint_${c.id}`, type: 'COMPLAINT', severity: 'info',
        title: `Complaint ${c.status === 'RESOLVED' ? 'resolved' : 'update'}: #${c.id}`,
        message: `"${c.subject}" is ${c.status.replace('_', ' ').toLowerCase()}. ${c.status === 'RESOLVED' ? 'Resolved by support.' : 'Our team is working on it.'}`,
        time: c.updatedAt || c.createdAt,
      });
    }

    // Large credits (≥ ₹10,000)
    for (const tx of transactions.slice(0, 30)) {
      if (['DEPOSIT', 'TRANSFER_IN', 'INTEREST_CREDIT'].includes(tx.transactionType) && Number(tx.amount) >= 10000) {
        notifs.push({ id: `credit_${tx.transactionReference}`, type: 'CREDIT', severity: 'info',
          title: 'Credit received',
          message: `₹${Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} credited on ${fmtDate(tx.transactionDateAndTime)}.${tx.transactionRemarks ? ' ' + tx.transactionRemarks : ''}`,
          time: tx.transactionDateAndTime,
        });
      }
    }

    // Card admin freeze/block status changes
    try {
      const adminCardMgmt = JSON.parse(localStorage.getItem('nova_card_admin_mgmt') || '{}');
      const cardHistory = JSON.parse(localStorage.getItem('novabank_product_history') || '[]');
      const approvedCards = cardHistory.filter(h => h.category === 'cards' && h.decision === 'APPROVED');
      for (const card of approvedCards) {
        const st = adminCardMgmt[card.title] || {};
        if (st.adminBlocked) {
          notifs.push({
            id: `card_blocked_${card.title}`,
            type: 'CARD_BLOCKED',
            severity: 'high',
            title: `Card blocked: ${card.title}`,
            message: `Your "${card.title}" has been blocked by the bank. All transactions on this card are suspended. Contact customer support for details.`,
            time: new Date().toISOString(),
          });
        } else if (st.adminFrozen) {
          notifs.push({
            id: `card_frozen_${card.title}`,
            type: 'CARD_FROZEN',
            severity: 'medium',
            title: `Card frozen: ${card.title}`,
            message: `Your "${card.title}" has been temporarily frozen by the bank. Contact customer support to resolve this.`,
            time: new Date().toISOString(),
          });
        }
      }
    } catch { /* ignore */ }

    // Incoming card payment requests
    try {
      const cardReqs = JSON.parse(localStorage.getItem('nova_card_payment_requests') || '[]');
      for (const req of cardReqs) {
        if (req.status === 'PENDING') {
          notifs.push({
            id: `card_req_${req.id}`,
            type: 'CARD_REQUEST',
            severity: 'medium',
            title: `Payment request from ${req.fromName}`,
            message: `${req.fromName} is requesting ₹${Number(req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} for "${req.description}" on your ${req.cardTitle}. Go to Cards → Incoming Requests to accept or decline.`,
            time: req.createdAt,
          });
        }
      }
    } catch { /* ignore */ }

    // Product applications & decisions (Cards, Loans, Deposits, Insurance, Investments, Services)
    try {
      const CATEGORY_LABELS = {
        cards: '💳 Card', loans: '📋 Loan', deposits: '🏦 Deposit',
        insurance: '🛡️ Insurance', investments: '📈 Investment',
        passbook_chequebook: '📒 Passbook/Chequebook',
      };
      const products = JSON.parse(localStorage.getItem('novabank_products') || '{}');
      for (const [cat, list] of Object.entries(products)) {
        const label = CATEGORY_LABELS[cat] || cat;
        for (const p of list) {
          notifs.push({
            id: `product_pending_${cat}_${p.title}_${p.appliedOn}`,
            type: 'PRODUCT_PENDING', severity: 'info',
            title: `${label} application pending`,
            message: `Your application for "${p.title}" is awaiting admin approval.`,
            time: p.appliedOn || new Date().toISOString(),
          });
        }
      }
      const history = JSON.parse(localStorage.getItem('novabank_product_history') || '[]');
      for (const h of history) {
        const label = CATEGORY_LABELS[h.category] || h.category;
        const approved = h.decision === 'APPROVED';
        notifs.push({
          id: `product_decision_${h.category}_${h.title}_${h.decidedOn}`,
          type: 'PRODUCT_DECISION', severity: approved ? 'info' : 'medium',
          title: `${label} ${approved ? 'approved' : 'declined'}: ${h.title}`,
          message: approved
            ? `Your "${h.title}" application has been approved. You can view it in the respective section.`
            : `Your "${h.title}" application was declined. Please contact support for details.`,
          time: h.decidedOn || new Date().toISOString(),
        });
      }
    } catch { /* ignore */ }

    // Rewards — tier milestone and redemption history
    try {
      const REWARDS_STATIC = [
        { id: 1, points: 500, status: 'claimed' }, { id: 2, points: 100, status: 'claimed' },
        { id: 3, points: 250, status: 'in-progress' }, { id: 4, points: 200, status: 'available' },
        { id: 5, points: 1000, status: 'available' }, { id: 6, points: 150, status: 'available' },
      ];
      const rewardStarts = (JSON.parse(localStorage.getItem('novabank_products') || '{}').rewards || []);
      const earnedPoints = REWARDS_STATIC.filter(r => r.status === 'claimed').reduce((s, r) => s + r.points, 0)
        + rewardStarts.length * 50;
      const redeemedPts = parseInt(localStorage.getItem('nova_redeemed_pts') || '0', 10);
      const totalPts = Math.max(0, earnedPoints - redeemedPts);
      const TIERS = [
        { name: 'Silver', min: 500 }, { name: 'Gold', min: 1500 }, { name: 'Platinum', min: 3000 },
      ];
      const reached = TIERS.filter(t => totalPts >= t.min);
      if (reached.length > 0) {
        const top = reached[reached.length - 1];
        notifs.push({
          id: `reward_tier_${top.name}`, type: 'REWARD', severity: 'info',
          title: `🎉 ${top.name} tier reached!`,
          message: `You have ${totalPts.toLocaleString('en-IN')} reward points and have reached ${top.name} status. Visit Rewards to redeem.`,
          time: new Date().toISOString(),
        });
      }
      const redemptions = JSON.parse(localStorage.getItem('nova_redemption_history') || '[]');
      for (const r of redemptions.slice(0, 3)) {
        notifs.push({
          id: `reward_redemption_${r.redeemedOn}`, type: 'REWARD', severity: 'info',
          title: `Reward redeemed: ${r.mode === 'cashback' ? 'Cashback' : 'Voucher'}`,
          message: `You redeemed ${Number(r.points).toLocaleString('en-IN')} points${r.voucher ? ` for a ${r.brand} voucher (${r.voucher})` : ' as cashback'}.`,
          time: r.redeemedOn || new Date().toISOString(),
        });
      }
    } catch { /* ignore */ }

    // Services — stopped cheques
    try {
      const stopped = JSON.parse(localStorage.getItem('nova_stopped_cheques') || '[]');
      if (stopped.length > 0) {
        notifs.push({
          id: `cheque_stopped_${stopped.join('_')}`,
          type: 'SERVICE', severity: 'medium',
          title: `${stopped.length} cheque payment${stopped.length > 1 ? 's' : ''} stopped`,
          message: `Stop-payment active for cheque${stopped.length > 1 ? 's' : ''}: #${stopped.slice(0, 5).join(', #')}${stopped.length > 5 ? ` and ${stopped.length - 5} more` : ''}. Visit Services to manage.`,
          time: new Date().toISOString(),
        });
      }
    } catch { /* ignore */ }

    // Loans — prepayment records
    try {
      const prepayments = JSON.parse(localStorage.getItem('nova_loan_prepayments') || '[]');
      for (const p of prepayments.slice(0, 5)) {
        notifs.push({
          id: `loan_prepay_${p.id || p.submittedAt}`,
          type: 'LOAN', severity: 'info',
          title: `Loan prepayment: ${p.loan}`,
          message: `₹${Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} prepaid towards "${p.loan}". Reflects by ${fmtDate(p.reflectsAt)}.`,
          time: p.submittedAt || new Date().toISOString(),
        });
      }
    } catch { /* ignore */ }

    return notifs.sort((a, b) => new Date(b.time) - new Date(a.time));
  }, [terminationNoticeDate, accounts, transactions, complaints]);

  const [broadcasts, setBroadcasts] = useState([]);

  useEffect(() => {
    const acctNum = accounts[0]?.accountNumber;
    if (!acctNum) return;
    api.get(`/admin-broadcasts/for-account?accountNumber=${encodeURIComponent(acctNum)}`)
      .then(r => setBroadcasts(r.data?.data || []))
      .catch(() => {});
  }, [accounts]);

  const adminBroadcasts = useMemo(() => broadcasts.map(b => ({
    id: `broadcast_${b.id}`,
    type: 'BROADCAST',
    severity: b.type === 'alert' ? 'high' : b.type === 'warning' ? 'medium' : 'info',
    title: `📢 ${b.title}`,
    message: b.message,
    time: b.sentAt,
  })), [broadcasts]);

  const allNotifications = useMemo(() => {
    const combined = [...adminBroadcasts, ...notifications];
    return combined.sort((a, b) => new Date(b.time) - new Date(a.time));
  }, [notifications, adminBroadcasts]);

  const visible = allNotifications.filter(n => !dismissed.includes(n.id));

  const filtered = useMemo(() => {
    if (!search.trim()) return visible;
    const q = search.toLowerCase();
    return visible.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.message || '').toLowerCase().includes(q) ||
      (n.type || '').toLowerCase().includes(q)
    );
  }, [visible, search]);

  // Sync unread count to localStorage so AppShell can show the badge
  useEffect(() => {
    localStorage.setItem('nova_notif_unread', String(visible.length));
    return () => localStorage.setItem('nova_notif_unread', '0'); // clear on unmount (user is on this page)
  }, [visible.length]);

  return (
    <AppShell role="CUSTOMER" title="Notifications" subtitle="All your account alerts and important messages.">

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[['All', notifications.length], ['Unread', visible.length], ['Dismissed', dismissed.length]].map(([l, c]) => (
            <span key={l} style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.25rem 0.6rem', borderRadius: '20px', background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
              {l}: {c}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none', fontSize: '0.85rem' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notifications…"
              style={{ padding: '0.4rem 1.8rem 0.4rem 1.8rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.85rem', background: 'var(--panel)', width: '200px' }} />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--muted)' }}>✕</button>}
          </div>
          {dismissed.length > 0 && (
          <button className="button button--ghost button--sm" onClick={() => { setDismissed([]); localStorage.removeItem('nova_notif_dismissed'); }}>
            ↩ Restore all dismissed
          </button>
          )}
        </div>
      </div>

      <SectionCard title="Inbox" subtitle={`${filtered.length} notification(s)${search ? ' matching search' : ''}.`}>
        {loading ? (
          <div className="empty-state">Loading notifications…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔔</div>
            <div>{search ? 'No notifications match your search.' : 'You have no new notifications.'}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map(n => {
              const meta = SEVERITY_META[n.severity] || SEVERITY_META.info;
              return (
                <div key={n.id} style={{ display: 'flex', gap: '1rem', padding: '1rem 1.1rem', borderRadius: '12px', border: `1.5px solid ${meta.border}`, background: meta.bg, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '1.5rem', flexShrink: 0, marginTop: '0.1rem' }}>{meta.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{n.title}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fff', background: meta.badge, borderRadius: '4px', padding: '0.1rem 0.35rem' }}>{n.type.replace('_', ' ')}</span>
                    </div>
                    <p style={{ fontSize: '0.83rem', color: 'var(--text)', marginTop: '0.3rem', lineHeight: 1.5 }}>{n.message}</p>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.35rem' }}>{fmtDate(n.time)}</div>
                  </div>
                  <button onClick={() => dismiss(n.id)} title="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem', padding: '0.2rem 0.4rem', flexShrink: 0 }}>✕</button>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </AppShell>
  );
}

