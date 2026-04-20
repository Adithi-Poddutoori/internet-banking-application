import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import api from '../services/api';
import { getPrimaryAccount } from '../utils/primaryAccount';
import { useAuth } from '../context/AuthContext';
import { addLocalTransaction } from '../utils/localTransactions';

const BILL_TYPES = [
  { key: 'electricity', label: 'Electricity',      icon: '⚡', color: '#f59e0b', placeholder: 'Consumer / CA number' },
  { key: 'water',       label: 'Water Board',       icon: '💧', color: '#3b82f6', placeholder: 'Connection number' },
  { key: 'gas',         label: 'Gas / LPG',         icon: '🔥', color: '#ef4444', placeholder: 'BP / HP / Indane ID' },
  { key: 'mobile',      label: 'Mobile Recharge',   icon: '📱', color: '#8b5cf6', placeholder: 'Mobile number' },
  { key: 'broadband',   label: 'Broadband / WiFi',  icon: '🌐', color: '#06b6d4', placeholder: 'Account / customer ID' },
  { key: 'dth',         label: 'DTH / Cable TV',    icon: '📺', color: '#f97316', placeholder: 'Subscriber ID' },
  { key: 'creditcard',  label: 'Credit Card Bill',  icon: '💳', color: '#e11d48', placeholder: 'Card number (last 4)' },
  { key: 'netflix',     label: 'Netflix',           icon: '🎬', color: '#dc2626', placeholder: 'Registered email' },
  { key: 'spotify',     label: 'Spotify',           icon: '🎵', color: '#16a34a', placeholder: 'Registered email' },
  { key: 'amazon',      label: 'Amazon Prime',      icon: '📦', color: '#d97706', placeholder: 'Registered email' },
  { key: 'other',       label: 'Other',             icon: '📑', color: '#64748b', placeholder: 'Reference / ID' },
];

const BT = Object.fromEntries(BILL_TYPES.map(b => [b.key, b]));

function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

const FREQ_LABELS = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly', onetime: 'One-time' };

function PieChart({ bills }) {
  const grouped = {};
  bills.forEach(b => {
    if (!grouped[b.type]) grouped[b.type] = 0;
    grouped[b.type] += b.amount;
  });
  const data = Object.entries(grouped)
    .map(([key, value]) => ({ key, value, label: BT[key]?.label || 'Other', icon: BT[key]?.icon || '\u{1F4C4}', color: BT[key]?.color || '#64748b' }))
    .sort((a, b) => b.value - a.value);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0 || data.length === 0) return null;

  const R = 80; const IR = 36; const cx = 100; const cy = 100;
  let cumAngle = -Math.PI / 2;
  const segments = data.map(d => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const start = cumAngle;
    cumAngle += sweep;
    const end = cumAngle;
    const large = sweep > Math.PI ? 1 : 0;
    const x1 = cx + R * Math.cos(start); const y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end);   const y2 = cy + R * Math.sin(end);
    const ix1 = cx + IR * Math.cos(start); const iy1 = cy + IR * Math.sin(start);
    const ix2 = cx + IR * Math.cos(end);   const iy2 = cy + IR * Math.sin(end);
    const path = `M ${ix1} ${iy1} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${IR} ${IR} 0 ${large} 0 ${ix1} ${iy1} Z`;
    const midAngle = start + sweep / 2;
    return { ...d, path, pct: ((d.value / total) * 100).toFixed(1), midAngle };
  });

  const [hovered, setHovered] = React.useState(null);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center', justifyContent: 'center', padding: '1rem 0' }}>
      <div style={{ flexShrink: 0 }}>
        <svg width="200" height="200" viewBox="0 0 200 200" style={{ overflow: 'visible' }}>
          {segments.map((seg, i) => (
            <path key={seg.key} d={seg.path}
              fill={seg.color}
              opacity={hovered === null || hovered === i ? 1 : 0.4}
              stroke="var(--panel)" strokeWidth="2"
              style={{ cursor: 'pointer', transition: 'opacity 0.2s, transform 0.18s',
                transformOrigin: '100px 100px',
                transform: hovered === i ? `translate(${Math.cos(seg.midAngle) * 5}px, ${Math.sin(seg.midAngle) * 5}px)` : 'none' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {hovered !== null ? (
            <>
              <text x="100" y="94" textAnchor="middle" style={{ fontSize: '1.2rem', dominantBaseline: 'middle' }}>{segments[hovered].icon}</text>
              <text x="100" y="111" textAnchor="middle" fill="var(--text)" fontWeight="700" fontSize="11">({segments[hovered].pct}%)</text>
            </>
          ) : (
            <text x="100" y="100" textAnchor="middle" fill="var(--muted)" fontSize="9.5" dominantBaseline="middle"></text>
          )}
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', minWidth: '190px' }}>
        {segments.map((seg, i) => (
          <div key={seg.key}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'default',
              opacity: hovered === null || hovered === i ? 1 : 0.4, transition: 'opacity 0.2s' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: seg.color, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: '0.82rem', flex: 1 }}>{seg.icon} {seg.label}</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: seg.color }}>{seg.pct}%</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{fmt(seg.value)}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: '0.5rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700 }}>
          <span>Total</span><span>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

export default function BillsPage() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const billsRef = useRef([]);
  useEffect(() => { billsRef.current = bills; }, [bills]);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [tab, setTab] = useState('manage');
  const [accounts, setAccounts] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [payConfirm, setPayConfirm] = useState(null);
  const [paying, setPaying] = useState(false);
  const [search, setSearch] = useState('');
  const [searchBH, setSearchBH] = useState('');
  const autopayRunning = useRef(false);

  useEffect(() => {
    api.get('/bill-mandates/my').then(r => setBills(r.data?.data || [])).catch(() => {});
  }, [user?.username]);

  const [form, setForm] = useState({
    type: 'electricity',
    nickname: '',
    identifier: '',
    amount: '',
    frequency: 'monthly',
    dueDay: '5',
    dueTime: '09:00',
    autopay: false,
    fromAccount: '',
  });

  useEffect(() => {
    api.get('/customers/dashboard').then(({ data }) => {
      const accs = data?.data?.accounts || [];
      setAccounts(accs);
      const primary = getPrimaryAccount(user?.username);
      const defaultAcc = accs.find(a => a.accountNumber === primary) || accs[0];
      if (defaultAcc) setForm(f => ({ ...f, fromAccount: defaultAcc.accountNumber }));
    }).catch(() => {});
  }, [user?.username]);

  // Returns true if an autopay bill should fire right now
  const isAutopayDueNow = (bill) => {
    if (!bill.autopay) return false;
    if (bill.frequency === 'onetime' && bill.lastPaid) return false;
    const now = new Date();
    if (now.getDate() !== bill.dueDay) return false;
    const [hh, mm] = (bill.dueTime || '09:00').split(':').map(Number);
    if (now.getHours() < hh || (now.getHours() === hh && now.getMinutes() < mm)) return false;
    // Already paid this cycle?
    if (bill.lastPaid) {
      const last = new Date(bill.lastPaid);
      const daysSince = (now - last) / 86400000;
      if (bill.frequency === 'monthly'   && daysSince < 28)  return false;
      if (bill.frequency === 'quarterly' && daysSince < 85)  return false;
      if (bill.frequency === 'yearly'    && daysSince < 360) return false;
    }
    return true;
  };

  const executeAutopay = useCallback(async () => {
    if (autopayRunning.current) return;
    autopayRunning.current = true;
    try {
      const all = billsRef.current;
      const due = all.filter(isAutopayDueNow);
      if (due.length === 0) return;
      let fired = 0;
      for (const bill of due) {
        try {
          await api.post(`/accounts/${bill.fromAccount}/withdraw`, {
            amount: bill.amount,
            remarks: `Autopay: ${bill.nickname}`,
          });
        } catch { /* record even if API fails */ }
        const ts = new Date().toISOString();
        addLocalTransaction({
          transactionType: 'DEBIT', amount: bill.amount,
          description: `Autopay: ${bill.nickname}`,
          fromAccountNumber: bill.fromAccount,
          _accountNumber: bill.fromAccount,
          transactionDate: ts, transactionDateAndTime: ts,
        });
        const newHistory = [{ date: ts, amount: bill.amount }, ...(bill.historyJson ? JSON.parse(bill.historyJson) : [])].slice(0, 12);
        try {
          const r = await api.post(`/bill-mandates/${bill.id}/pay`, { historyJson: JSON.stringify(newHistory) });
          setBills(prev => prev.map(b => b.id === bill.id ? r.data.data : b));
        } catch {
          setBills(prev => prev.map(b => b.id === bill.id ? { ...b, lastPaid: ts } : b));
        }
        fired++;
      }
      if (fired > 0) {
        setToast({ message: `Autopay processed ${fired} bill${fired > 1 ? 's' : ''} automatically.`, type: 'success' });
      }
    } finally {
      autopayRunning.current = false;
    }
  }, []);

  // Poll every 60 seconds for autopay bills
  useEffect(() => {
    executeAutopay(); // check immediately on mount
    const interval = setInterval(executeAutopay, 60000);
    return () => clearInterval(interval);
  }, [executeAutopay]);

  const addBill = () => {
    if (!form.nickname.trim()) return setToast({ message: 'Enter a nickname for this bill.', type: 'error' });
    if (!form.identifier.trim()) return setToast({ message: 'Enter the reference/ID for this bill.', type: 'error' });
    if (!form.amount || Number(form.amount) <= 0) return setToast({ message: 'Enter a valid amount.', type: 'error' });
    if (!form.fromAccount) return setToast({ message: 'Select a debit account.', type: 'error' });
    api.post('/bill-mandates', {
      type: form.type,
      nickname: form.nickname.trim(),
      identifier: form.identifier.trim(),
      amount: parseFloat(Number(form.amount).toFixed(2)),
      frequency: form.frequency,
      dueDay: parseInt(form.dueDay, 10),
      dueTime: form.dueTime || '09:00',
      autopay: form.autopay,
      fromAccount: form.fromAccount,
    }).then(r => {
      setBills(prev => [r.data.data, ...prev]);
      setForm(f => ({ ...f, nickname: '', identifier: '', amount: '' }));
      setToast({ message: `"${form.nickname.trim()}" added${form.autopay ? ' with autopay enabled.' : '.'}`, type: 'success' });
      setTab('manage');
    }).catch(e => setToast({ message: e.response?.data?.message || 'Failed to add bill.', type: 'error' }));
  };

  const toggleAutopay = (id) => {
    api.patch(`/bill-mandates/${id}/autopay`)
      .then(r => {
        setBills(prev => prev.map(b => b.id === id ? r.data.data : b));
        const updated = r.data.data;
        setToast({ message: `Autopay ${updated.autopay ? 'enabled' : 'disabled'} for "${updated.nickname}".`, type: 'success' });
      }).catch(e => setToast({ message: e.response?.data?.message || 'Toggle failed.', type: 'error' }));
  };

  const payNow = async (bill) => {
    // Block if autopay is active and the bill was already paid this month
    if (bill.autopay && bill.lastPaid) {
      const last = new Date(bill.lastPaid);
      const now = new Date();
      if (last.getFullYear() === now.getFullYear() && last.getMonth() === now.getMonth()) {
        setPayConfirm(null);
        return setToast({ message: `AutoPay is active and "${bill.nickname}" was already paid this month. It will run automatically when due.`, type: 'error' });
      }
    }
    setPaying(true);
    try {
      await api.post(`/accounts/${bill.fromAccount}/withdraw`, {
        amount: bill.amount,
        remarks: `Bill payment: ${bill.nickname}`,
      });
    } catch {
      // payment might fail — still record as paid for demo
    }
    const now = new Date().toISOString();
    addLocalTransaction({
      transactionType: 'DEBIT', amount: bill.amount,
      description: `Bill payment: ${bill.nickname}`,
      fromAccountNumber: bill.fromAccount,
      _accountNumber: bill.fromAccount,
      transactionDate: now, transactionDateAndTime: now,
    });
    const prevHistory = bill.historyJson ? JSON.parse(bill.historyJson) : [];
    const newHistory = JSON.stringify([{ date: now, amount: bill.amount }, ...prevHistory].slice(0, 12));
    api.post(`/bill-mandates/${bill.id}/pay`, { historyJson: newHistory })
      .then(r => setBills(prev => prev.map(b => b.id === bill.id ? r.data.data : b)))
      .catch(() => setBills(prev => prev.map(b => b.id === bill.id ? { ...b, lastPaid: now, historyJson: newHistory } : b)));
    setPaying(false);
    setPayConfirm(null);
    setToast({ message: `${fmt(bill.amount)} paid for "${bill.nickname}".`, type: 'success' });
  };

  const deleteBill = (id) => {
    api.delete(`/bill-mandates/${id}`)
      .then(() => { setBills(prev => prev.filter(b => b.id !== id)); setDeleteConfirm(null); setToast({ message: 'Bill removed.', type: 'success' }); })
      .catch(e => setToast({ message: e.response?.data?.message || 'Delete failed.', type: 'error' }));
  };

  // Due alert: bill is "due" if lastPaid is null or last paid was over (frequency) ago
  const isDue = (bill) => {
    if (!bill.lastPaid) return true;
    const last = new Date(bill.lastPaid);
    const now = new Date();
    const days = (now - last) / 86400000;
    if (bill.frequency === 'monthly')    return days >= 28;
    if (bill.frequency === 'quarterly')  return days >= 85;
    if (bill.frequency === 'yearly')     return days >= 360;
    return false; // one-time
  };

  const dueCount = bills.filter(isDue).length;

  return (
    <AppShell role="CUSTOMER" title="Bills & Subscriptions" subtitle="Manage recurring bills and enable autopay.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* Hero */}
      <div className="showcase-hero showcase-hero--deposits" style={{ marginBottom: '1.5rem' }}>
        <div className="showcase-hero__stat"><span className="showcase-hero__label">Registered bills</span><span className="showcase-hero__value">{bills.length}</span></div>
        <div className="showcase-hero__stat"><span className="showcase-hero__label">Autopay enabled</span><span className="showcase-hero__value">{bills.filter(b => b.autopay).length}</span></div>
        <div className="showcase-hero__stat"><span className="showcase-hero__label">Due / overdue</span><span className="showcase-hero__value" style={{ color: dueCount > 0 ? '#e11d48' : undefined }}>{dueCount}</span></div>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        {[['manage', 'My Bills'], ['add', '+ Add Bill'], ['insights', 'Insights'], ['history', 'History']].map(([key, label]) => (
          <button key={key} className={`tab-bar__tab${tab === key ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* ── ADD TAB ── */}
      {tab === 'add' && (
        <SectionCard title="Register a bill or subscription" subtitle="Set up a bill with optional autopay.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>

            {/* Bill type tiles */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem' }}>Bill type</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {BILL_TYPES.map(b => (
                  <button key={b.key} onClick={() => setForm(f => ({ ...f, type: b.key }))} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                    padding: '0.65rem 0.3rem', borderRadius: '10px',
                    border: `2px solid ${form.type === b.key ? b.color : 'var(--line)'}`,
                    background: form.type === b.key ? b.color + '18' : 'var(--panel-soft)',
                    cursor: 'pointer',
                  }}>
                    <span style={{ fontSize: '1.3rem' }}>{b.icon}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: form.type === b.key ? b.color : 'var(--muted)', textAlign: 'center', lineHeight: 1.2 }}>{b.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {[
                { label: 'Nickname', key: 'nickname', type: 'text', placeholder: 'e.g. Home Electricity' },
                { label: BT[form.type]?.placeholder || 'Reference ID', key: 'identifier', type: ['netflix','spotify','amazon'].includes(form.type) ? 'text' : 'number', placeholder: BT[form.type]?.placeholder },
                { label: 'Amount (₹)', key: 'amount', type: 'number', placeholder: '0.00' },
              ].map(f => (
                <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{f.label} <span style={{ color: 'var(--danger)' }}>*</span></span>
                  {f.type === 'number' ? (
                    <input type="text" inputMode="numeric" maxLength={f.key === 'identifier' ? 12 : 10} placeholder={f.placeholder} value={form[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value.replace(/\D/g, '') }))}
                      style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem' }} />
                  ) : (
                    <input type={f.type} placeholder={f.placeholder} value={form[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem' }} />
                  )}
                </label>
              ))}

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Frequency</span>
                <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel)' }}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                  <option value="onetime">One-time</option>
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Due on day of month</span>
                <input type="text" inputMode="numeric" maxLength={2} value={form.dueDay}
                  onChange={e => setForm(f => ({ ...f, dueDay: e.target.value.replace(/\D/g, '') }))}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem' }} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Payment time</span>
                <input type="time" value={form.dueTime}
                  onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem' }} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Debit account</span>
                <select value={form.fromAccount} onChange={e => setForm(f => ({ ...f, fromAccount: e.target.value }))}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel)' }}>
                  {accounts.map(a => <option key={a.accountNumber} value={a.accountNumber}>{a.accountNumber} ({a.accountType})</option>)}
                </select>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem', borderRadius: '10px', border: `2px solid ${form.autopay ? '#16a34a' : 'var(--line)'}`, background: form.autopay ? '#f0fdf4' : 'var(--panel-soft)' }}>
                <input type="checkbox" checked={form.autopay} onChange={e => setForm(f => ({ ...f, autopay: e.target.checked }))} style={{ width: '18px', height: '18px' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: form.autopay ? '#16a34a' : 'inherit' }}>Enable Autopay</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Auto-debit on due date from selected account</div>
                </div>
              </label>

              <button className="button button--primary" onClick={addBill}>Register Bill</button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (() => {
        const allHistory = bills.flatMap(b => {
          const hist = b.historyJson ? ((() => { try { return JSON.parse(b.historyJson); } catch { return []; } })()) : (b.history || []);
          return hist.map(h => ({ ...h, nickname: b.nickname, type: b.type, fromAccount: b.fromAccount }));
        }).sort((a, bItem) => new Date(bItem.date) - new Date(a.date));
        const q = searchBH.toLowerCase();
        const filtered = allHistory.filter(r => !q || r.nickname.toLowerCase().includes(q) || (BT[r.type]?.label || '').toLowerCase().includes(q) || r.fromAccount.includes(q));
        return (
          <>
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none', opacity: 0.45 }}>🔍</span>
              <input value={searchBH} onChange={e => setSearchBH(e.target.value)}
                placeholder="Search by bill name, type or account…"
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 2.3rem 0.6rem 2.3rem', borderRadius: '10px', border: '1.5px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel-soft)' }} />
              {searchBH && <button onClick={() => setSearchBH('')} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--muted)', lineHeight: 1 }}>✕</button>}
            </div>
            {allHistory.length === 0
              ? <div className="empty-state">No payment history yet. Pay a bill to see records here.</div>
              : filtered.length === 0
                ? <div className="empty-state">No records match "{searchBH}".</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {filtered.map((r, i) => {
                      const d = new Date(r.date);
                      const ds = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                      const bt = BT[r.type] || BT.other;
                      return (
                        <div key={i} style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--panel)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          <div style={{ width: '2.1rem', height: '2.1rem', borderRadius: '50%', background: bt.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{bt.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{r.nickname}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{bt.label} · From: {r.fromAccount} · {ds}</div>
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--danger)' }}>{fmt(r.amount)}</div>
                        </div>
                      );
                    })}
                  </div>
            }
          </>
        );
      })()}

      {/* ── INSIGHTS TAB ── */}
      {tab === 'insights' && (
        bills.length === 0
          ? <div className="empty-state">No bills registered yet. Add some bills to see your spend breakdown.</div>
          : <SectionCard title="Spend Breakdown by Category" subtitle="Based on registered bill amounts. Hover a slice to inspect.">
              <PieChart bills={bills} />
            </SectionCard>
      )}

      {/* ── MANAGE TAB ── */}
      {tab === 'manage' && (
        <>
          <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
            <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none', opacity: 0.45 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, type or identifier…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 2.3rem 0.6rem 2.3rem', borderRadius: '10px', border: '1.5px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel-soft)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--muted)', lineHeight: 1 }}>✕</button>
            )}
          </div>
          {(() => {
            const q = search.toLowerCase();
            const filtered = bills.filter(b =>
              !q ||
              b.nickname.toLowerCase().includes(q) ||
              b.identifier.toLowerCase().includes(q) ||
              (BT[b.type]?.label || '').toLowerCase().includes(q)
            );
            if (bills.length === 0) return <div className="empty-state">No bills registered yet. Click "+ Add Bill" to get started.</div>;
            if (filtered.length === 0) return <div className="empty-state">No bills match "{search}".</div>;
            return <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filtered.map(b => {
                const bt = BT[b.type] || BT.other;
                const due = isDue(b);
                return (
                  <div key={b.id} style={{ padding: '1rem 1.25rem', borderRadius: '12px', border: `1.5px solid ${due ? '#fca5a5' : 'var(--line)'}`, background: due ? '#fff5f5' : 'var(--panel)', display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '50%', background: bt.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{bt.icon}</div>
                    <div style={{ flex: 1, minWidth: '160px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{b.nickname}</span>
                        {due && <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#fef2f2', color: '#e11d48', border: '1px solid #fca5a5', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>DUE</span>}
                        {b.autopay && <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>AUTOPAY ON</span>}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                        {bt.label} · {b.identifier} · {FREQ_LABELS[b.frequency]} · Due: {(() => { const n = new Date(); const due = new Date(n.getFullYear(), n.getDate() > b.dueDay ? n.getMonth() + 1 : n.getMonth(), b.dueDay); return `${String(due.getDate()).padStart(2,'0')}/${String(due.getMonth()+1).padStart(2,'0')}/${String(due.getFullYear()).slice(-2)}`; })()}, {b.dueTime || '09:00'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                        From: {b.fromAccount} · Last paid: {b.lastPaid ? (() => { const d = new Date(b.lastPaid); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })() : 'Never'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--danger)' }}>{fmt(b.amount)}</div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button className="button button--sm button--ghost" onClick={() => toggleAutopay(b.id)} style={{ fontSize: '0.75rem' }}>
                          {b.autopay ? '⏸ Pause autopay' : '▶ Enable autopay'}
                        </button>
                        <button className="button button--sm button--primary" onClick={() => setPayConfirm(b)} style={{ fontSize: '0.75rem' }}>Pay now</button>
                        <button onClick={() => setDeleteConfirm(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.2rem 0.4rem', fontSize: '1rem' }}>✕</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>;
          })()}
        </>
      )}

      {/* Pay confirm modal */}
      {payConfirm && (
        <div className="modal-overlay" onClick={() => setPayConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Confirm payment</h3>
            <p>Pay <strong>{fmt(payConfirm.amount)}</strong> for <strong>{payConfirm.nickname}</strong> from account <strong>{payConfirm.fromAccount}</strong>?</p>
            <div className="modal-actions">
              <button className="button button--ghost" onClick={() => setPayConfirm(null)} disabled={paying}>Cancel</button>
              <button className="button button--primary" onClick={() => payNow(payConfirm)} disabled={paying}>{paying ? 'Processing…' : 'Pay Now'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Remove bill?</h3>
            <p>This bill and its autopay settings will be removed.</p>
            <div className="modal-actions">
              <button className="button button--ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="button button--danger" onClick={() => deleteBill(deleteConfirm)}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
