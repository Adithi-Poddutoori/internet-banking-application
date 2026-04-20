import { useState, useMemo, useEffect } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import api from '../services/api';
import { useAutoRefresh } from '../utils/useAutoRefresh';

const STORAGE_KEY = 'nova_expenses';

const KEYWORD_MAP = [
  { keys: ['zomato','swiggy','food','restaurant','cafe','café','dining','lunch','dinner','breakfast','pizza','burger','biryani','dominos'], cat: 'food' },
  { keys: ['uber','ola','rapido','metro','petrol','fuel','diesel','cab','auto rickshaw','bus','train','irctc','toll','parking'],          cat: 'transport' },
  { keys: ['amazon','flipkart','myntra','meesho','nykaa','ajio','mall','supermarket','grocery','dmart','reliance fresh'],                cat: 'shopping' },
  { keys: ['electricity','jio','airtel',' vi ','bsnl','broadband','wifi','internet bill','mobile bill','recharge','dth','gas cylinder','water bill'], cat: 'bills' },
  { keys: ['hospital','clinic','pharmacy','doctor','medical','apollo','fortis','medplus','medicine','diagnostic'],                      cat: 'health' },
  { keys: ['netflix','prime video','hotstar','spotify','cinema','movie','pvr','inox','concert','gaming'],                               cat: 'entertainment' },
  { keys: ['school','college','university','tuition','course fee','education','textbook','library','institute'],                        cat: 'education' },
  { keys: ['flight','airline','indigo','spicejet','goair','oyo','booking.com','makemytrip','holiday','resort','tour package'],          cat: 'travel' },
];

const CATEGORIES = [
  { key: 'food',        label: 'Food & Dining',    icon: '🍽️',  color: '#f97316' },
  { key: 'transport',   label: 'Transport',         icon: '🚗',  color: '#3b82f6' },
  { key: 'shopping',    label: 'Shopping',          icon: '🛒',  color: '#8b5cf6' },
  { key: 'bills',       label: 'Bills & Utilities', icon: '💡',  color: '#eab308' },
  { key: 'health',      label: 'Health & Medical',  icon: '🏥',  color: '#10b981' },
  { key: 'entertainment', label: 'Entertainment',   icon: '🎬',  color: '#ec4899' },
  { key: 'education',   label: 'Education',         icon: '📚',  color: '#06b6d4' },
  { key: 'travel',      label: 'Travel',            icon: '✈️',  color: '#f59e0b' },
  { key: 'other',       label: 'Other',             icon: '📦',  color: '#64748b' },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function loadExpenses() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function loadImported() {
  return new Set();
}

function normalizeExpense(e) {
  if (!e) return e;
  return { ...e, date: e.date || e.expenseDate };
}

function guessCategory(remarks) {
  if (!remarks) return 'other';
  const lower = remarks.toLowerCase();
  for (const { keys, cat } of KEYWORD_MAP) {
    if (keys.some(k => lower.includes(k))) return cat;
  }
  return 'other';
}

function guessPaymentMode(type) {
  if (type === 'WITHDRAWAL')  return 'cash';
  if (type === 'IMPS')        return 'upi';
  if (type === 'NEFT' || type === 'RTGS') return 'netbanking';
  return 'netbanking';
}

function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const today = new Date();
const DEFAULT_MONTH = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

export default function ExpenseTrackerPage() {
  const [expenses, setExpenses] = useState([]);
  const [importedIds, setImportedIds] = useState(new Set());
  const [toast, setToast] = useState({ message: '', type: '' });
  const [tab, setTab] = useState('add');    // 'add' | 'history' | 'summary'
  const [filterMonth, setFilterMonth] = useState(DEFAULT_MONTH);
  const [filterCat, setFilterCat] = useState('all');
  const [searchExp, setSearchExp] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [transactions, setTransactions] = useState([]);

  // form state
  const [form, setForm] = useState({
    amount: '',
    category: 'food',
    description: '',
    date: today.toISOString().slice(0, 10),
    paymentMode: 'cash',
  });

  const persist = (next) => { setExpenses(next); };

  const syncTransactions = async () => {
    try {
      const [txnRes, impRes, expRes] = await Promise.all([
        api.get('/transactions'),
        api.get('/expenses/my/imported-ids').catch(() => ({ data: { data: [] } })),
        api.get('/expenses/my').catch(() => ({ data: { data: [] } })),
      ]);
      const txns = txnRes.data.data || [];
      setTransactions(txns);
      const serverExpenses = (expRes.data?.data || []).map(normalizeExpense);
      setExpenses(serverExpenses);
      const serverImported = new Set(impRes.data?.data || []);
      setImportedIds(serverImported);
      const newEntries = [];
      for (const t of txns) {
        if (!DEBIT_TYPES.has(t.transactionType)) continue;
        if (serverImported.has(t.transactionReference)) continue;
        newEntries.push({
          transactionId: t.transactionReference,
          amount: parseFloat(Number(t.amount).toFixed(2)),
          category: guessCategory(t.transactionRemarks),
          description: t.transactionRemarks?.trim() || t.transactionType?.replaceAll('_', ' ') || 'Bank transaction',
          expenseDate: t.transactionDateAndTime ? t.transactionDateAndTime.slice(0, 10) : new Date().toISOString().slice(0, 10),
          paymentMode: guessPaymentMode(t.transactionType),
          source: 'IMPORTED',
        });
      }
      if (newEntries.length > 0) {
        const results = await Promise.allSettled(newEntries.map(e => api.post('/expenses', e)));
        const added = results.filter(r => r.status === 'fulfilled').map(r => normalizeExpense(r.value.data?.data)).filter(Boolean);
        if (added.length > 0) setExpenses(prev => [...added, ...prev]);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => { syncTransactions(); }, []);
  useAutoRefresh(syncTransactions, 30000);

  const addExpense = async () => {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      return setToast({ message: 'Enter a valid amount greater than 0.', type: 'error' });
    }
    if (!form.description.trim()) {
      return setToast({ message: 'Enter a description for this expense.', type: 'error' });
    }
    try {
      const res = await api.post('/expenses', {
        amount: parseFloat(Number(form.amount).toFixed(2)),
        category: form.category,
        description: form.description.trim(),
        expenseDate: form.date,
        paymentMode: form.paymentMode,
        source: 'MANUAL',
      });
      const entry = res.data?.data || {};
      setExpenses(prev => [normalizeExpense(entry), ...prev]);
      setForm(f => ({ ...f, amount: '', description: '' }));
      setToast({ message: `Expense of ${fmt(entry.amount || form.amount)} added under ${CAT_MAP[form.category].label}.`, type: 'success' });
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Failed to save expense.', type: 'error' });
    }
  };

  const deleteExpense = async (id) => {
    try {
      await api.delete(`/expenses/${id}`);
      setExpenses(prev => prev.filter(e => e.id !== id));
      setDeleteConfirm(null);
      setToast({ message: 'Expense deleted.', type: 'success' });
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Failed to delete.', type: 'error' });
    }
  };

  // --- filtered list ---
  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const monthMatch = !filterMonth || e.date.startsWith(filterMonth);
      const catMatch = filterCat === 'all' || e.category === filterCat;
      return monthMatch && catMatch;
    }).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }, [expenses, filterMonth, filterCat]);

  // --- summary ---
  const summary = useMemo(() => {
    const byCategory = {};
    let total = 0;
    for (const e of filtered) {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
      total += e.amount;
    }
    const sorted = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([key, amount]) => ({ ...CAT_MAP[key], amount, pct: total > 0 ? (amount / total) * 100 : 0 }));
    return { byCategory: sorted, total };
  }, [filtered]);

  // --- insights: monthly breakdown for last 6 months ---
  const insights = useMemo(() => {
    const monthMap = {};
    for (const e of expenses) {
      const ym = e.date.slice(0, 7);
      monthMap[ym] = (monthMap[ym] || 0) + e.amount;
    }
    const incomeMap = {};
    for (const t of transactions) {
      if (!['DEPOSIT','TRANSFER_IN','INTEREST_CREDIT'].includes(t.transactionType)) continue;
      const ym = (t.transactionDateAndTime || '').slice(0, 7);
      if (ym) incomeMap[ym] = (incomeMap[ym] || 0) + Number(t.amount);
    }
    // last 6 calendar months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        ym,
        label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        expense: monthMap[ym] || 0,
        income:  incomeMap[ym] || 0,
      });
    }
    const allExpenses = months.map(m => m.expense);
    const maxVal = Math.max(...allExpenses, ...months.map(m => m.income), 1);
    const thisMonth = months[5];
    const lastMonth = months[4];
    const avg = allExpenses.slice(0, 5).reduce((s, v) => s + v, 0) / 5;
    const saving = thisMonth.income - thisMonth.expense;
    return { months, maxVal, thisMonth, lastMonth, avg, saving };
  }, [expenses, transactions]);

  // --- month options from existing expenses + current month ---
  const monthOptions = useMemo(() => {
    const set = new Set([DEFAULT_MONTH]);
    expenses.forEach(e => set.add(e.date.slice(0, 7)));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [expenses]);

  const formatMonthLabel = (ym) => {
    const [y, m] = ym.split('-');
    return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
  };

  return (
    <AppShell role="CUSTOMER" title="Expense Tracker" subtitle="Track and categorise your personal spending.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* ── TABS ── */}
      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        {[['add', '+ Add Expense'], ['history', 'History'], ['summary', 'Summary'], ['insights', 'Insights']].map(([key, label]) => (
          <button key={key} className={`tab-bar__tab${tab === key ? ' tab-bar__tab--active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════ ADD TAB ══════════════════════════ */}
      {tab === 'add' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <SectionCard title="New expense" subtitle="Log an expense to your tracker.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Amount */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Amount (₹) <span style={{ color: 'var(--danger)' }}>*</span></span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value.replace(/\D/g, '') }))}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '1.05rem', fontWeight: 600 }}
                />
              </label>

              {/* Description */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Description <span style={{ color: 'var(--danger)' }}>*</span></span>
                <input
                  type="text"
                  placeholder="e.g. Lunch at Café, Metro ticket…"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addExpense()}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.95rem' }}
                />
              </label>

              {/* Category */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Category</span>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel)' }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </label>

              {/* Date */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Date</span>
                <input
                  type="date"
                  value={form.date}
                  max={today.toISOString().slice(0, 10)}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem' }}
                />
              </label>

              {/* Payment mode */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Payment mode</span>
                <select
                  value={form.paymentMode}
                  onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel)' }}
                >
                  <option value="cash">💵 Cash</option>
                  <option value="debit">💳 Debit Card</option>
                  <option value="credit">🏦 Credit Card</option>
                  <option value="netbanking">🌐 Net Banking</option>
                  <option value="upi">📱 UPI</option>
                  <option value="other">📦 Other</option>
                </select>
              </label>

              <button
                className="button button--primary"
                onClick={addExpense}
                style={{ marginTop: '0.25rem' }}
              >
                Add Expense
              </button>
            </div>
          </SectionCard>

          {/* Quick category tiles */}
          <SectionCard title="Quick pick category" subtitle="Tap a category to pre-select it.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  onClick={() => setForm(f => ({ ...f, category: c.key }))}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem',
                    padding: '0.85rem 0.5rem', borderRadius: '12px', border: `2px solid ${form.category === c.key ? c.color : 'var(--line)'}`,
                    background: form.category === c.key ? c.color + '18' : 'var(--panel-soft)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{c.icon}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: form.category === c.key ? c.color : 'var(--muted)', textAlign: 'center', lineHeight: 1.2 }}>{c.label}</span>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══════════════════════════ HISTORY TAB ══════════════════════════ */}
      {tab === 'history' && (
        <SectionCard
          title="Expense history"
          subtitle={`${filtered.length} record(s) • ${fmt(filtered.reduce((s, e) => s + e.amount, 0))} total`}
        >
          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Month
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '0.85rem', background: 'var(--panel)' }}
              >
                <option value="">All time</option>
                {monthOptions.map(ym => (
                  <option key={ym} value={ym}>{formatMonthLabel(ym)}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Category
              <select
                value={filterCat}
                onChange={e => setFilterCat(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '0.85rem', background: 'var(--panel)' }}
              >
                <option value="all">All categories</option>
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
              </select>
            </label>
          </div>
          <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
            <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none', opacity: 0.45 }}>🔍</span>
            <input value={searchExp} onChange={e => setSearchExp(e.target.value)}
              placeholder="Search by description…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 2.3rem 0.6rem 2.3rem', borderRadius: '10px', border: '1.5px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel-soft)' }} />
            {searchExp && <button onClick={() => setSearchExp('')} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--muted)', lineHeight: 1 }}>✕</button>}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">No expenses found for this filter.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {filtered.filter(e => !searchExp || e.description.toLowerCase().includes(searchExp.toLowerCase()) || (CAT_MAP[e.category]?.label || '').toLowerCase().includes(searchExp.toLowerCase())).map(e => {
                const cat = CAT_MAP[e.category] || CAT_MAP.other;
                return (
                  <div key={e.id} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.75rem 1rem', borderRadius: '10px',
                    background: 'var(--panel-soft)', border: '1px solid var(--line)',
                  }}>
                    <div style={{
                      width: '2.5rem', height: '2.5rem', borderRadius: '50%', flexShrink: 0,
                      background: cat.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem',
                    }}>{cat.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.description}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                        {cat.label} · {e.date} · {e.paymentMode.charAt(0).toUpperCase() + e.paymentMode.slice(1)}
                        {e.source === 'auto' && <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', fontWeight: 600, color: '#3b82f6', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '0.05rem 0.3rem' }}>auto-synced</span>}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--danger)', flexShrink: 0 }}>{fmt(e.amount)}</div>
                    <button
                      onClick={() => setDeleteConfirm(e.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem', padding: '0.2rem 0.4rem', borderRadius: '4px' }}
                      title="Delete"
                    >✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}

      {/* ══════════════════════════ SUMMARY TAB ══════════════════════════ */}
      {tab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Month filter */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Showing:</span>
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '0.875rem', background: 'var(--panel)' }}
            >
              <option value="">All time</option>
              {monthOptions.map(ym => <option key={ym} value={ym}>{formatMonthLabel(ym)}</option>)}
            </select>
          </div>

          {/* Total banner */}
          <div style={{
            padding: '1.25rem 1.5rem', borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--primary) 0%, #1e6fa8 100%)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Total spending • {filterMonth ? formatMonthLabel(filterMonth) : 'All time'}</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '0.2rem' }}>{fmt(summary.total)}</div>
            </div>
            <div style={{ fontSize: '2.5rem' }}></div>
          </div>

          {summary.byCategory.length === 0 ? (
            <div className="empty-state">No expenses logged for this period.</div>
          ) : (
            <SectionCard title="Breakdown by category" subtitle={`${summary.byCategory.length} category(ies) • ${filtered.length} transaction(s)`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {summary.byCategory.map(cat => (
                  <div key={cat.key}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{cat.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{cat.pct.toFixed(1)}%</span>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: cat.color }}>{fmt(cat.amount)}</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: '6px', background: 'var(--line)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${cat.pct}%`, background: cat.color, borderRadius: '99px', transition: 'width 0.4s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ══════════════════════════ INSIGHTS TAB ══════════════════════════ */}
      {tab === 'insights' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'This month spend', value: fmt(insights.thisMonth.expense), sub: `vs ${fmt(insights.lastMonth.expense)} last month`, color: '#e11d48' },
              { label: 'This month income', value: fmt(insights.thisMonth.income), sub: 'credits & deposits', color: '#16a34a' },
              { label: 'Savings this month', value: fmt(Math.max(0, insights.saving)), sub: insights.saving < 0 ? '⚠️ overspent' : '✓ positive', color: insights.saving >= 0 ? '#2563eb' : '#dc2626' },
              { label: 'Avg monthly spend', value: fmt(insights.avg), sub: 'last 5 months', color: '#7c3aed' },
            ].map(s => (
              <div key={s.label} style={{ padding: '1.1rem 1.25rem', borderRadius: '14px', background: 'var(--panel)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 500, marginBottom: '0.3rem' }}>{s.label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Income vs Expense bar chart */}
          <SectionCard title="Income vs Expenses — last 6 months" subtitle="Bar chart based on your transactions and logged expenses.">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', height: '180px', padding: '0 0.5rem' }}>
              {insights.months.map(m => {
                const expH = insights.maxVal > 0 ? (m.expense / insights.maxVal) * 150 : 0;
                const incH = insights.maxVal > 0 ? (m.income  / insights.maxVal) * 150 : 0;
                return (
                  <div key={m.ym} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '155px' }}>
                      <div title={`Income: ${fmt(m.income)}`} style={{ width: '14px', height: `${incH}px`, background: '#16a34a', borderRadius: '3px 3px 0 0', minHeight: m.income > 0 ? '4px' : '0', transition: 'height 0.4s' }} />
                      <div title={`Expense: ${fmt(m.expense)}`} style={{ width: '14px', height: `${expH}px`, background: '#e11d48', borderRadius: '3px 3px 0 0', minHeight: m.expense > 0 ? '4px' : '0', transition: 'height 0.4s' }} />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 500, textAlign: 'center' }}>{m.label}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', justifyContent: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--muted)' }}><span style={{ width: '12px', height: '12px', background: '#16a34a', borderRadius: '2px', display: 'inline-block' }} />Income</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--muted)' }}><span style={{ width: '12px', height: '12px', background: '#e11d48', borderRadius: '2px', display: 'inline-block' }} />Expenses</span>
            </div>
          </SectionCard>

          {/* Monthly trend table */}
          <SectionCard title="Monthly breakdown" subtitle="Expense and income by month.">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--line)' }}>
                    {['Month', 'Income', 'Expenses', 'Saved / Deficit'].map(h => (
                      <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: h === 'Month' ? 'left' : 'right', fontWeight: 600, color: 'var(--muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...insights.months].reverse().map(m => {
                    const net = m.income - m.expense;
                    return (
                      <tr key={m.ym} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{m.label}</td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{fmt(m.income)}</td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: '#e11d48', fontWeight: 600 }}>{fmt(m.expense)}</td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700, color: net >= 0 ? '#2563eb' : '#dc2626' }}>
                          {net >= 0 ? '+' : ''}{fmt(net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Delete expense?</h3>
            <p>This entry will be permanently removed from your tracker.</p>
            <div className="modal-actions">
              <button className="button button--ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="button button--danger" onClick={() => deleteExpense(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
