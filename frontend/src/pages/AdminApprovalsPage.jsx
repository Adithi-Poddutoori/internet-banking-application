import { useEffect, useState } from 'react';
import { useAutoRefresh } from '../utils/useAutoRefresh';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import api from '../services/api';
import { formatCurrency, formatDate, formatDateIN, formatINR, maskAccount } from '../utils/formatters';
import { getProducts, removeProduct, addProductHistory, getProductHistory } from '../utils/products';
import { BRANCHES as ALL_BRANCHES } from '../utils/branches';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'account', label: 'Account Opening' },
  { key: 'card', label: 'Cards' },
  { key: 'loan', label: 'Loans' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'investment', label: 'Investments' },
  { key: 'deposit', label: 'Deposits' },
  { key: 'passbook', label: 'Passbook / Chequebook' },
];

const CATEGORY_MAP = { cards: 'card', loans: 'loan', insurance: 'insurance', investments: 'investment', deposits: 'deposit', accounts: 'account', passbook_chequebook: 'passbook' };

const CATEGORY_ICONS = {
  account: '',
  card: '',
  loan: '',
  insurance: '',
  investment: '',
  deposit: '',
  passbook: '',
};

/** Shared table header cell — upper-case muted label */
const TH = s => <th key={s} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>{s}</th>;

function categorize(item) {
  if (item._productCategory) return item._productCategory;
  const type = (item.requestedAccountType || item.category || '').toUpperCase();
  if (['SAVINGS', 'TERM', 'STUDENT', 'RURAL', 'URBAN', 'WOMEN', 'SENIOR_CITIZEN', 'NRI'].includes(type)) return 'account';
  if (type === 'CARD') return 'card';
  if (type === 'LOAN') return 'loan';
  if (type === 'INSURANCE') return 'insurance';
  if (type === 'INVESTMENT') return 'investment';
  if (type === 'DEPOSIT') return 'deposit';
  return 'account';
}

function buildProductItems() {
  const products = getProducts();
  const items = [];
  for (const [storageKey, list] of Object.entries(products)) {
    const cat = CATEGORY_MAP[storageKey];
    if (!cat) continue;
    for (const p of list) {
      items.push({
        _isProduct: true,
        _productCategory: cat,
        _storageKey: storageKey,
        _productTitle: p.title,
        productId: `${storageKey}__${p.title}`,
        customerName: p.customerName || '',
        username: p.username || '',
        emailId: '—',
        phoneNo: '—',
        status: 'PENDING_APPROVAL',
        requestedAccountType: p.title,
        requestedOn: p.appliedOn,
      });
    }
  }
  return items;
}

export default function AdminApprovalsPage() {
  const navigate = useNavigate();
  const [apiPending, setApiPending] = useState([]);
  const [productItems, setProductItems] = useState([]);
  const [notes, setNotes] = useState({});
  const [toast, setToast] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [viewMode, setViewMode] = useState('pending'); // 'pending' or 'history'
  const [historyCustomers, setHistoryCustomers] = useState([]);
  const [productHistory, setProductHistory] = useState([]);
  const [viewItem, setViewItem] = useState(null); // details modal
  const [historySort, setHistorySort] = useState('newest'); // 'newest' | 'oldest' | 'alpha'
  const [historySearch, setHistorySearch] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [productControlSearch, setProductControlSearch] = useState('');
  const [adminCardConfirm, setAdminCardConfirm] = useState(null); // { title, action } — custom confirm popup

  // Claims & cheques — fetched from backend
  const [allClaims, setAllClaims] = useState([]);
  const [allCheques, setAllCheques] = useState([]);

  // Locker requests — from backend
  const [allLockers, setAllLockers] = useState([]);
  const [lockerAssign, setLockerAssign] = useState(null); // request being assigned
  const [lockerNote, setLockerNote] = useState('');       // admin note for assignment
  const [lockerBranchView, setLockerBranchView] = useState(''); // branch shown on map

  async function refreshLocalData() {
    try {
      const [claimsRes, chequesRes] = await Promise.all([
        api.get('/insurance-claims/admin'),
        api.get('/stopped-cheques/admin'),
      ]);
      setAllClaims(claimsRes.data?.data || []);
      setAllCheques((chequesRes.data?.data || []).map(c => ({
        id: c.id,
        chequeNo: c.chequeNo,
        customerName: c.customerName,
        username: c.customerUsername,
        stoppedAt: c.stoppedAt,
        reason: c.reason || '',
        status: c.status || 'PENDING',
        adminNote: c.adminNote || '',
        decidedAt: c.decidedAt || null,
      })));
      // Update lockers from backend on every refresh
      try {
        const lockersRes = await api.get('/locker-requests/admin');
        setAllLockers(lockersRes.data?.data || []);
        if (!lockerBranchView) {
          const first = (lockersRes.data?.data || [])[0];
          if (first) setLockerBranchView(first.branch);
        }
      } catch { /* ignore */ }
    } catch {
      try { setAllClaims(JSON.parse(localStorage.getItem('nova_insurance_claims') || '[]')); } catch { setAllClaims([]); }
      try {
        const raw = JSON.parse(localStorage.getItem('nova_stopped_cheques') || '[]');
        setAllCheques(raw.map(e => typeof e === 'string' ? { chequeNo: e, customerName: '', username: '', stoppedAt: '', reason: '' } : e));
      } catch { setAllCheques([]); }
    }
  }

  // Admin card mgmt helpers
  const ADMIN_CARD_KEY = 'nova_card_admin_mgmt';
  function loadAdminCardMgmt() { try { return JSON.parse(localStorage.getItem(ADMIN_CARD_KEY) || '{}'); } catch { return {}; } }
  function saveAdminCardMgmt(o) { localStorage.setItem(ADMIN_CARD_KEY, JSON.stringify(o)); }
  function getAdminCardState(cardKey) { return loadAdminCardMgmt()[cardKey] || {}; }
  const [adminCardState, setAdminCardState] = useState(loadAdminCardMgmt);

  const doAdminCardAction = async (cardKey, displayTitle, action) => {
    const all = loadAdminCardMgmt();
    const cur = all[cardKey] || {};
    if (action === 'freeze')   all[cardKey] = { ...cur, adminFrozen: true };
    if (action === 'unfreeze') all[cardKey] = { ...cur, adminFrozen: false };
    if (action === 'block')    all[cardKey] = { ...cur, adminBlocked: true, adminFrozen: true };
    if (action === 'unblock')  all[cardKey] = { ...cur, adminBlocked: false, adminFrozen: false };
    saveAdminCardMgmt(all);
    setAdminCardState({ ...all });

    // Persist to backend — cardKey = "username__cardTitle"
    const parts = cardKey.split('__');
    const username = parts[0];
    const title = parts.slice(1).join('__');
    const isBlocking = action === 'block' || action === 'freeze';
    try {
      await api.put('/product-requests/admin/block', {
        customerUsername: username,
        category: 'cards',
        productTitle: title,
        blocked: isBlocking,
      });
    } catch { /* localStorage fallback already written */ }

    const labels = { freeze: 'frozen', unfreeze: 'unfrozen', block: 'blocked', unblock: 'unblocked' };
    setToast({ message: `Card "${displayTitle}" ${labels[action]} successfully.`, type: 'success' });
    setAdminCardConfirm(null);
  };

  const loadProducts = async () => {
    try {
      const { data } = await api.get('/product-requests/admin');
      const all = data?.data || [];
      const pending = all.filter(r => r.status === 'PENDING');
      const decided = all.filter(r => r.status !== 'PENDING');

      setProductItems(pending.map(r => ({
        _isProduct: true,
        _productCategory: CATEGORY_MAP[r.category] || 'account',
        _storageKey: r.category,
        _productTitle: r.productTitle,
        _backendId: r.id,
        _formData: r.formData || null,
        productId: `${r.category}__${r.productTitle}__${r.id}`,
        customerName: r.customerName || '',
        username: r.customerUsername || '',
        emailId: '—',
        phoneNo: '—',
        status: 'PENDING_APPROVAL',
        requestedAccountType: r.productTitle,
        requestedOn: r.appliedOn,
      })));

      // Rebuild history from backend decided items
      setProductHistory(decided.map(r => ({
        category: r.category,
        title: r.productTitle,
        decision: r.status,
        decidedOn: r.decidedOn,
        customerName: r.customerName || '',
        username: r.customerUsername || '',
      })));
      // Clear stale localStorage product entries so the localStorage fallback won't surface old duplicates
      try {
        const stale = JSON.parse(localStorage.getItem('novabank_products') || '{}');
        ['loans','insurance','investments','deposits','cards','passbook_chequebook'].forEach(k => { stale[k] = []; });
        localStorage.setItem('novabank_products', JSON.stringify(stale));
      } catch { /* ignore */ }
    } catch { /* fallback to localStorage */
      setProductItems(buildProductItems());
      setProductHistory(getProductHistory());
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/dashboard');
      setApiPending(data.data.pendingApplications || []);
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Unable to load approvals.', type: 'error' });
    } finally {
      setLoading(false);
    }
    loadProducts();
    // setProductHistory is now handled inside loadProducts()
    try {
      const { data } = await api.get('/admin/customers');
      const nonPending = (data.data || []).filter(c => c.status === 'APPROVED' || c.status === 'DECLINED');
      setHistoryCustomers(nonPending);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); refreshLocalData(); }, []);
  useAutoRefresh(load, 5000);

  useEffect(() => {
    const handleFocus = () => { loadProducts(); refreshLocalData(); };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const pending = [...apiPending, ...productItems];

  const ADMIN_PRODUCT_BLOCK_KEY = 'nova_admin_product_blocks';
  function loadProductBlocks() { try { return JSON.parse(localStorage.getItem(ADMIN_PRODUCT_BLOCK_KEY) || '{}'); } catch { return {}; } }
  function saveProductBlocks(o) { localStorage.setItem(ADMIN_PRODUCT_BLOCK_KEY, JSON.stringify(o)); }
  const [productBlockState, setProductBlockState] = useState(loadProductBlocks);

  const doProductBlockAction = async (category, title, action, customerUsername) => {
    const isBlocking = action === 'block' || action === 'suspend';

    // Optimistic localStorage update for immediate admin UI feedback
    // Key includes username so blocking is per-customer, not global
    const all = loadProductBlocks();
    const key = `${customerUsername}__${category}__${title}`;
    const cur = all[key] || {};
    if (action === 'block')     all[key] = { ...cur, adminBlocked: true,  adminSuspended: false };
    if (action === 'unblock')   all[key] = { ...cur, adminBlocked: false, adminSuspended: false };
    if (action === 'suspend')   all[key] = { ...cur, adminSuspended: true,  adminBlocked: false };
    if (action === 'unsuspend') all[key] = { ...cur, adminSuspended: false };
    saveProductBlocks(all);
    setProductBlockState({ ...all });

    // Persist to backend via the blocked column on ProductRequest
    if (customerUsername) {
      try {
        await api.put('/product-requests/admin/block', {
          customerUsername,
          category,
          productTitle: title,
          blocked: isBlocking,
        });
      } catch { /* localStorage fallback already applied */ }
    }

    const labels = { block: 'blocked', unblock: 'unblocked', suspend: 'suspended', unsuspend: 'reinstated' };
    setToast({ message: `"${title}" ${labels[action]} successfully.`, type: 'success' });
    setAdminCardConfirm(null);
  };

  const decide = async (item, action) => {
    if (item._isProduct) {
      try {
        await api.put(`/product-requests/admin/${item._backendId}/decide`, {
          decision: action === 'approve' ? 'APPROVED' : 'DECLINED',
          adminNote: notes[item.productId] || '',
        });
        setToast({ message: `"${item._productTitle}" ${action}d successfully.`, type: 'success' });
        loadProducts();
      } catch (e) {
        // Fallback to localStorage if API unavailable
        addProductHistory(item._storageKey, item._productTitle, action === 'approve' ? 'APPROVED' : 'DECLINED', item.customerName || '', item.username || '');
        removeProduct(item._storageKey, item._productTitle);
        setToast({ message: `"${item._productTitle}" ${action}d successfully.`, type: 'success' });
        setProductItems(buildProductItems());
        setProductHistory(getProductHistory());
      }
      return;
    }
    try {
      await api.post(`/admin/customers/${item.customerId}/${action}`, { remarks: notes[item.customerId] || '' });
      setToast({ message: `Customer application ${action}d successfully.`, type: 'success' });
      load();
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Decision could not be completed.', type: 'error' });
    }
  };

  const revokeProduct = async (h, idx) => {
    // Try backend first if we have an id stored
    let done = false;
    if (h._backendId) {
      try {
        await api.put(`/product-requests/admin/${h._backendId}/decide`, { decision: 'DECLINED', adminNote: 'Revoked by admin' });
        done = true;
        loadProducts();
      } catch { /* fall through to localStorage */ }
    }
    if (!done) {
      // Patch localStorage history entry
      const hist = getProductHistory();
      const entry = hist.find((e, i) => i === idx || (e.category === h.category && e.title === h.title && e.decidedOn === h.decidedOn));
      if (entry) entry.decision = 'DECLINED';
      try { localStorage.setItem('novabank_product_history', JSON.stringify(hist)); } catch { /* ignore */ }
      setProductHistory([...hist]);
    }
    // Also block it in the product block map so customer sees it immediately
    const all = loadProductBlocks();
    const key = `${h.category}__${h.title}`;
    all[key] = { ...(all[key] || {}), adminBlocked: true };
    saveProductBlocks(all);
    setProductBlockState({ ...all });
    setToast({ message: `"${h.title}" approval revoked.`, type: 'info' });
  };

  const categoryCounts = pending.reduce((acc, item) => {
    const cat = categorize(item);
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const filtered = (() => {
    const byCat = activeCategory === 'all' ? pending : pending.filter(item => categorize(item) === activeCategory);
    if (!pendingSearch.trim()) return byCat;
    const q = pendingSearch.toLowerCase();
    return byCat.filter(item =>
      (item.customerName || '').toLowerCase().includes(q) ||
      (item._productTitle || '').toLowerCase().includes(q) ||
      (item.emailId || '').toLowerCase().includes(q) ||
      (item.username || '').toLowerCase().includes(q) ||
      (item.requestedAccountType || '').toLowerCase().includes(q)
    );
  })();

  return (
    <AppShell role="ADMIN" title="Approvals" subtitle="Review and approve or decline pending applications.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      <div className="tab-bar" style={{ marginBottom: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`tab-bar__tab${viewMode === 'pending' ? ' tab-bar__tab--active' : ''}`} onClick={() => setViewMode('pending')}>
            Pending ({pending.length})
          </button>
          <button className={`tab-bar__tab${viewMode === 'history' ? ' tab-bar__tab--active' : ''}`} onClick={() => setViewMode('history')}>
            History ({historyCustomers.length + productHistory.length})
          </button>
          <button className={`tab-bar__tab${viewMode === 'cards' ? ' tab-bar__tab--active' : ''}`} onClick={() => setViewMode('cards')}>
            Product Control
          </button>
          <button className={`tab-bar__tab${viewMode === 'claims' ? ' tab-bar__tab--active' : ''}`} onClick={() => setViewMode('claims')}>
            Claims
          </button>
          <button className={`tab-bar__tab${viewMode === 'cheques' ? ' tab-bar__tab--active' : ''}`} onClick={() => setViewMode('cheques')}>
            Cheques {allCheques.filter(c => c.status === 'PENDING').length > 0 ? `(${allCheques.filter(c => c.status === 'PENDING').length})` : ''}
          </button>
          <button className={`tab-bar__tab${viewMode === 'lockers' ? ' tab-bar__tab--active' : ''}`} onClick={() => setViewMode('lockers')}>
            Lockers {allLockers.filter(l => l.status === 'PENDING').length > 0 ? `(${allLockers.filter(l => l.status === 'PENDING').length})` : ''}
          </button>
        </div>
        <button className="button button--outline button--sm" onClick={loadProducts}>↻ Refresh</button>
      </div>

      {viewMode === 'pending' && (<>
      <div className="approval-categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            className={`approval-cat-btn${activeCategory === cat.key ? ' approval-cat-btn--active' : ''}`}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.label}
            <span className="approval-cat-btn__count">
              {cat.key === 'all' ? pending.length : (categoryCounts[cat.key] || 0)}
            </span>
          </button>
        ))}
      </div>

      <SectionCard title="Pending applications" subtitle={`${filtered.length} application(s) in "${CATEGORIES.find(c => c.key === activeCategory)?.label}" category.`}>
        {loading ? <div className="empty-state">Loading pending approvals...</div> : null}
        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', opacity: 0.45, pointerEvents: 'none' }}>🔍</span>
          <input value={pendingSearch} onChange={e => setPendingSearch(e.target.value)}
            placeholder="Search by name, email, product or account type…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 2.3rem', borderRadius: '10px', border: '1.5px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel-soft)' }} />
          {pendingSearch && <button onClick={() => setPendingSearch('')} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--muted)', lineHeight: 1 }}>✕</button>}
        </div>
        <div className="approval-list">
          {filtered.length ? filtered.map((item) => {
            const key = item._isProduct ? item.productId : item.customerId;
            const cat = categorize(item);
            return (
            <div className="approval-card" key={key}>
              <div className="approval-card__top">
                <div>
                  <h3>{item._isProduct ? `${CATEGORY_ICONS[cat] || ''} ${item._productTitle}` : item.customerName}</h3>
                  <p>{item._isProduct ? 'Product application from current session' : `${item.emailId} • ${item.phoneNo}`}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="badge badge--info">{cat.toUpperCase()}</span>
                  <span className="pill pill--pending">{item.status}</span>
                </div>
              </div>
              <div className="approval-card__meta">
                <span>{item.requestedAccountType} request</span>
                {!item._isProduct && <span>{maskAccount(item.accountNumber)}</span>}
                {!item._isProduct && <span>{formatCurrency(item.openingDeposit)}</span>}
                <span>{formatDate(item.requestedOn)}</span>
              </div>
              {!item._isProduct && (
                <textarea
                  placeholder="Optional review remarks"
                  value={notes[item.customerId] || ''}
                  onChange={(e) => setNotes(p => ({ ...p, [item.customerId]: e.target.value }))}
                />
              )}
              <div className="approval-card__actions">
                <button className="button button--outline button--sm" onClick={() => setViewItem(item)}>View Details</button>
                <button className="button button--secondary" onClick={() => decide(item, 'approve')}>Approve</button>
                <button className="button button--ghost-danger" onClick={() => decide(item, 'decline')}>Decline</button>
              </div>
            </div>
            );
          }) : <div className="empty-state">No pending applications in this category.</div>}
        </div>
      </SectionCard>
      </>)}

      {viewMode === 'history' && (() => {
        // Build a unified list with a canonical date and name for sorting
        const combined = [
          ...historyCustomers.map(c => ({
            _type: 'customer',
            _id: c.id,
            name: c.customerName,
            date: null, // no date from API, use id as proxy
            status: c.status,
            data: c,
          })),
          ...productHistory.map((h, i) => ({
            _type: 'product',
            _id: `prod-${i}`,
            name: h.title,
            date: h.decidedOn ? new Date(h.decidedOn) : null,
            status: h.decision,
            data: h,
            idx: i,
          })),
        ];

        const sorted = [...combined].sort((a, b) => {
          if (historySort === 'alpha') return a.name.localeCompare(b.name);
          if (historySort === 'oldest') {
            // customers: lower id first; products: earlier date first
            if (a._type === 'customer' && b._type === 'customer') return a._id - b._id;
            if (a._type === 'product' && b._type === 'product') return (a.date || 0) - (b.date || 0);
            return a._type === 'customer' ? -1 : 1;
          }
          // newest (default): higher id first; products: most recent date first
          if (a._type === 'customer' && b._type === 'customer') return b._id - a._id;
          if (a._type === 'product' && b._type === 'product') return (b.date || 0) - (a.date || 0);
          return a._type === 'product' ? -1 : 1;
        });

        const searchQuery = historySearch.trim().toLowerCase();
        const filtered = searchQuery
          ? sorted.filter(item =>
              item.name.toLowerCase().includes(searchQuery) ||
              item.status.toLowerCase().includes(searchQuery) ||
              (item._type === 'product' && item.data.category?.toLowerCase().includes(searchQuery)) ||
              (item._type === 'customer' && (item.data.emailId?.toLowerCase().includes(searchQuery) || item.data.phoneNo?.includes(searchQuery)))
            )
          : sorted;

        return (
          <SectionCard
            title="Approval History"
            subtitle={`${filtered.length} of ${combined.length} past decision(s).`}
            actions={
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="🔍 Search by name, status, category…"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  style={{ padding: '0.3rem 0.65rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.82rem', width: '220px', background: 'var(--panel)' }}
                />
                <label htmlFor="history-sort" style={{ fontSize: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Sort</label>
                <select
                  id="history-sort"
                  value={historySort}
                  onChange={e => setHistorySort(e.target.value)}
                  style={{ fontSize: '0.85rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer' }}
                >
                  <option value="newest">Most recent</option>
                  <option value="oldest">Oldest first</option>
                  <option value="alpha">A → Z</option>
                </select>
              </div>
            }
          >
            <div className="approval-list">
              {filtered.length ? filtered.map(item => {
                if (item._type === 'customer') {
                  const c = item.data;
                  return (
                    <div className="approval-card" key={`cust-${c.id}`}>
                      <div className="approval-card__top">
                        <div>
                          <h3>{c.customerName}</h3>
                          <p>{c.emailId} • {c.phoneNo}</p>
                        </div>
                        <span className={`pill pill--${c.status.toLowerCase()}`}>{c.status}</span>
                      </div>
                      <div className="approval-card__meta">
                        <span>Account opening</span>
                        <span>User ID: {c.userId}</span>
                      </div>
                    </div>
                  );
                }
                const h = item.data;
                return (
                  <div className="approval-card" key={item._id}>
                    <div className="approval-card__top">
                      <div>
                        <h3>{CATEGORY_ICONS[CATEGORY_MAP[h.category]] || ''} {h.title}</h3>
                        <p>Product application • {h.category}</p>
                      </div>
                      <span className={`pill pill--${h.decision.toLowerCase()}`}>{h.decision}</span>
                    </div>
                    <div className="approval-card__meta">
                      <span>{h.category}</span>
                      <span>{formatDate(h.decidedOn)}</span>
                    </div>
                  </div>
                );
              }) : <div className="empty-state">{searchQuery ? `No results matching "${historySearch}".` : 'No approval history yet.'}</div>}
            </div>
          </SectionCard>
        );
      })()}

      {viewMode === 'cards' && (() => {
        const PRODUCT_CONTROL_CATS = [
          { key: 'cards',       label: 'Cards',       icon: '' },
          { key: 'insurance',   label: 'Insurance',   icon: '' },
          { key: 'deposits',    label: 'Deposits',    icon: '' },
          { key: 'investments', label: 'Investments', icon: '' },
          { key: 'loans',       label: 'Loans',       icon: '' },

        ];
        const pcQuery = productControlSearch.trim().toLowerCase();
        return (
          <>
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', opacity: 0.45, pointerEvents: 'none' }}>🔍</span>
              <input
                value={productControlSearch}
                onChange={e => setProductControlSearch(e.target.value)}
                placeholder="Search by product name or customer…"
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 2.3rem', borderRadius: '10px', border: '1.5px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel-soft)' }}
              />
              {productControlSearch && (
                <button onClick={() => setProductControlSearch('')} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--muted)', lineHeight: 1 }}>✕</button>
              )}
            </div>
            {PRODUCT_CONTROL_CATS.map(({ key, label, icon }) => {
              const approved = productHistory
                .filter(h => h.category === key && h.decision === 'APPROVED')
                .filter(h => !pcQuery || (h.title || '').toLowerCase().includes(pcQuery) || (h.customerName || '').toLowerCase().includes(pcQuery) || (h.username || '').toLowerCase().includes(pcQuery));
              if (approved.length === 0 && key !== 'cards') return null;
              return (
                <SectionCard key={key} title={`${icon} ${label} Control`}
                  subtitle={`${approved.length} approved ${label.toLowerCase()} product(s). Block or unblock.`}
                  style={{ marginBottom: '1rem' }}>
                  {approved.length === 0 ? (
                    <div className="empty-state">No approved {label.toLowerCase()} products yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {approved.map(h => {
                        const stKey = `${h.username}__${key}__${h.title}`;
                        const cardKey = `${h.username}__${h.title}`;
                        const st = key === 'cards'
                          ? (adminCardState[cardKey] || {})
                          : (productBlockState[stKey] || {});
                        const isBlocked   = !!st.adminBlocked;
                        const borderColor = isBlocked ? '#7c3aed' : '#86efac';
                        const bgColor     = isBlocked ? '#faf5ff' : '#f0fdf4';
                        const actionFn = key === 'cards'
                          ? () => setAdminCardConfirm({ title: h.title, username: h.username, action: isBlocked ? 'unblock' : 'block', _isCard: true })
                          : () => setAdminCardConfirm({ title: h.title, username: h.username, category: key, action: isBlocked ? 'unblock' : 'block', _isProduct: true });
                        return (
                          <div key={cardKey || `${h.customerName}__${h.title}`} style={{ padding: '1rem 1.25rem', borderRadius: '12px', border: `1.5px solid ${borderColor}`, background: bgColor, display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div style={{ fontSize: '1.8rem', flexShrink: 0 }}>{icon}</div>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{h.title}</span>
                                {isBlocked
                                  ? <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#faf5ff', color: '#7c3aed', border: '1px solid #c4b5fd', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>🚫 BLOCKED</span>
                                  : <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>✅ ACTIVE</span>
                                }
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                                Customer: {h.customerName || '—'} · Category: {label}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                              <button className={`button button--sm ${isBlocked ? 'button--primary' : 'button--ghost-danger'}`} style={{ fontSize: '0.78rem' }}
                                onClick={actionFn}>
                                {isBlocked ? '✅ Unblock' : '🚫 Block'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>
              );
            })}
          </>
        );
      })()}

      {viewMode === 'claims' && (() => {
        const STATUS_MAP = { PENDING: { color: '#d97706', label: '⏳ Pending' }, APPROVED: { color: '#16a34a', label: '✅ Approved' }, SETTLED: { color: '#16a34a', label: '✔ Settled' }, DECLINED: { color: '#e11d48', label: '❌ Declined' } };
        const updateClaim = async (claimId, claimRef, newStatus) => {
          try {
            await api.put(`/insurance-claims/admin/${claimId}`, { status: newStatus });
          } catch {
            // Fallback: patch localStorage copy
            try {
              const all = JSON.parse(localStorage.getItem('nova_insurance_claims') || '[]');
              const idx = all.findIndex(x => x.id === claimId || x.ref === claimRef);
              if (idx >= 0) { all[idx] = { ...all[idx], status: newStatus }; localStorage.setItem('nova_insurance_claims', JSON.stringify(all)); }
            } catch { /* ignore */ }
          }
          setToast({ message: `Claim ${claimRef} marked as ${newStatus}.`, type: newStatus === 'APPROVED' || newStatus === 'SETTLED' ? 'success' : 'info' });
          refreshLocalData();
        };
        const pending = allClaims.filter(c => c.status === 'PENDING');
        const resolved = allClaims.filter(c => c.status !== 'PENDING');
        return (
          <SectionCard title="Insurance Claims" subtitle={`${allClaims.length} total · ${pending.length} pending`}>
            {allClaims.length === 0 ? <div className="empty-state">No insurance claims submitted yet.</div> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>{['Reference', 'Customer', 'Policy', 'Type', 'Amount', 'Incident', 'Submitted', 'Status', 'Action'].map(TH)}</tr></thead>
                  <tbody>
                    {allClaims.map((cl, i) => {
                      const sm = STATUS_MAP[cl.status] || STATUS_MAP.PENDING;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: cl.status === 'PENDING' ? 'rgba(251,191,36,0.04)' : 'transparent' }}>
                          <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{cl.ref}</td>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{cl.customerName || cl.username || '—'}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{cl.policy}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{cl.type}</td>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{formatINR(cl.amount)}</td>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>{formatDateIN(cl.incidentDate)}</td>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>{formatDateIN(cl.submittedAt)}</td>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: sm.color }}>{sm.label}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>
                            {cl.status === 'PENDING' && (
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button className="button button--sm button--primary" onClick={() => updateClaim(cl.id, cl.ref, 'APPROVED')}>Approve</button>
                                <button className="button button--sm button--ghost" onClick={() => updateClaim(cl.id, cl.ref, 'SETTLED')}>Settle</button>
                                <button className="button button--sm button--ghost-danger" onClick={() => updateClaim(cl.id, cl.ref, 'DECLINED')}>Decline</button>
                              </div>
                            )}
                            {cl.status === 'APPROVED' && <button className="button button--sm button--ghost" onClick={() => updateClaim(cl.id, cl.ref, 'SETTLED')}>Mark Settled</button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        );
      })()}

      {viewMode === 'cheques' && (() => {
        const pendingCheques = allCheques.filter(c => c.status === 'PENDING');
        const decidedCheques = allCheques.filter(c => c.status !== 'PENDING');

        const decideCheque = async (chq, action) => {
          try {
            const res = await api.put(`/stopped-cheques/admin/${chq.id}/decide`, { action, adminNote: '' });
            const updated = res.data?.data;
            setAllCheques(prev => prev.map(c => c.id === chq.id
              ? { ...c, status: updated?.status || (action === 'approve' ? 'APPROVED' : 'DECLINED'), decidedAt: updated?.decidedAt || new Date().toISOString() }
              : c));
            setToast({ message: `Cheque #${chq.chequeNo} stop request ${action === 'approve' ? 'approved' : 'declined'}.`, type: 'success' });
          } catch {
            setToast({ message: 'Failed to record decision. Please try again.', type: 'error' });
          }
        };

        const TH2 = (label) => <th key={label} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</th>;

        return (
          <>
            <SectionCard title={`⏳ Pending Stop-Cheque Requests (${pendingCheques.length})`} subtitle="Review and approve or decline customer stop-payment requests.">
              {pendingCheques.length === 0 ? <div className="empty-state">No pending stop-cheque requests.</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>{['#', 'Cheque No.', 'Customer', 'Reason', 'Requested On', 'Actions'].map(TH2)}</tr></thead>
                    <tbody>
                      {pendingCheques.map((chq, i) => (
                        <tr key={chq.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>{i + 1}</td>
                          <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>#{chq.chequeNo}</td>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{chq.customerName || chq.username || '—'}</td>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)', fontSize: '0.82rem' }}>{chq.reason || '—'}</td>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDateIN(chq.stoppedAt)}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button className="button button--sm button--primary" onClick={() => decideCheque(chq, 'approve')}>✅ Approve</button>
                              <button className="button button--sm button--ghost-danger" onClick={() => decideCheque(chq, 'decline')}>❌ Decline</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            {decidedCheques.length > 0 && (
              <SectionCard title={`Decided Requests (${decidedCheques.length})`} subtitle="Previously approved or declined stop-payment requests.">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>{['#', 'Cheque No.', 'Customer', 'Reason', 'Requested On', 'Status'].map(TH2)}</tr></thead>
                    <tbody>
                      {decidedCheques.map((chq, i) => {
                        const approved = chq.status === 'APPROVED';
                        return (
                          <tr key={chq.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>{i + 1}</td>
                            <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem' }}>#{chq.chequeNo}</td>
                            <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{chq.customerName || chq.username || '—'}</td>
                            <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)', fontSize: '0.82rem' }}>{chq.reason || '—'}</td>
                            <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDateIN(chq.stoppedAt)}</td>
                            <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: approved ? '#16a34a' : '#e11d48' }}>
                              {approved ? '✅ Stop Approved' : '❌ Declined'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}
          </>
        );
      })()}

      {viewMode === 'lockers' && (() => {
        // ── Theatre-style locker management ─────────────────────────────────
        const ROWS = ['A', 'B', 'C', 'D', 'E'];
        const COLS = [1, 2, 3, 4, 5, 6, 7, 8];
        const rowSize = (ri) => ri < 2 ? 'Small' : ri < 4 ? 'Medium' : 'Large';
        const SIZE_COLOR = { Small: '#3b82f6', Medium: '#f59e0b', Large: '#8b5cf6' };
        const SIZE_BG    = { Small: '#eff6ff', Medium: '#fffbeb', Large: '#f5f3ff' };

        // Gather all branches from requests, plus add defaults
        const requestBranches   = [...new Set(allLockers.map(r => r.branch).filter(b => !ALL_BRANCHES.includes(b)))];
        const BRANCHES          = [...ALL_BRANCHES, ...requestBranches];
        const activeBranch      = lockerBranchView || BRANCHES[0];

        // Lockers occupied at the active branch
        const occupied = new Set(
          allLockers
            .filter(r => r.branch === activeBranch && r.status === 'ASSIGNED' && r.assignedLocker)
            .map(r => r.assignedLocker)
        );
        // Map lockerId → request for occupied (for hover tooltip)
        const occupiedMap = {};
        allLockers
          .filter(r => r.branch === activeBranch && r.status === 'ASSIGNED' && r.assignedLocker)
          .forEach(r => { occupiedMap[r.assignedLocker] = r; });

        const pendingLockers = allLockers.filter(l => l.status === 'PENDING');
        const decidedLockers = allLockers.filter(l => l.status !== 'PENDING');

        const assignLocker = async (req, lockerId) => {
          try {
            const res = await api.put(`/locker-requests/admin/${req.id}/assign`, { assignedLocker: lockerId });
            setAllLockers(prev => prev.map(r => r.id === req.id ? (res.data?.data || { ...r, status: 'ASSIGNED', assignedLocker: lockerId }) : r));
            setToast({ message: `Locker ${lockerId} at ${req.branch} assigned to ${req.customerName || req.username}.`, type: 'success' });
            setLockerAssign(null);
          } catch {
            setToast({ message: 'Failed to assign locker. Please try again.', type: 'error' });
          }
        };

        const declineRequest = async (req) => {
          try {
            const res = await api.put(`/locker-requests/admin/${req.id}/decline`);
            setAllLockers(prev => prev.map(r => r.id === req.id ? (res.data?.data || { ...r, status: 'DECLINED' }) : r));
            setToast({ message: `Locker request by ${req.customerName || req.username} declined.`, type: 'info' });
          } catch {
            setToast({ message: 'Failed to decline request. Please try again.', type: 'error' });
          }
        };

        const fmtD = formatDateIN;

        // When assigning, highlight matching lockers at the request's branch
        const assigningAtBranch = lockerAssign?.branch;
        const assigningSize     = lockerAssign?.size;
        // occupied for the request's branch (may differ from activeBranch view)
        const assignBranchOccupied = new Set(
          allLockers
            .filter(r => r.branch === assigningAtBranch && r.status === 'ASSIGNED' && r.assignedLocker && r.id !== lockerAssign?.id)
            .map(r => r.assignedLocker)
        );

        const totalPerBranch    = ROWS.length * COLS.length;
        const occupiedCount     = occupied.size;
        const availableCount    = totalPerBranch - occupiedCount;

        return (
          <>
            {/* Branch Locker Overview */}
            <SectionCard
              title="Locker Facility Overview"
              subtitle={`${allLockers.length} total requests · ${pendingLockers.length} pending · ${allLockers.filter(l => l.status === 'ASSIGNED').length} assigned`}
            >
              {/* Branch Tabs */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {BRANCHES.map(b => {
                  const bPending  = allLockers.filter(r => r.branch === b && r.status === 'PENDING').length;
                  const bOccupied = allLockers.filter(r => r.branch === b && r.status === 'ASSIGNED' && r.assignedLocker).length;
                  return (
                    <button
                      key={b}
                      onClick={() => setLockerBranchView(b)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '8px',
                        border: `2px solid ${activeBranch === b ? 'var(--primary)' : 'var(--line)'}`,
                        background: activeBranch === b ? 'var(--primary-soft, #eff6ff)' : 'var(--panel)',
                        fontWeight: activeBranch === b ? 700 : 400,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        color: activeBranch === b ? 'var(--primary)' : 'var(--text)',
                        display: 'flex', alignItems: 'center', gap: '0.45rem',
                      }}
                    >
                      {b.split(' — ')[1] || b}
                      {bPending > 0 && (
                        <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.65rem', fontWeight: 800, borderRadius: '10px', padding: '0.05rem 0.4rem' }}>{bPending}</span>
                      )}
                      {bOccupied > 0 && (
                        <span style={{ background: '#e5e7eb', color: '#6b7280', fontSize: '0.65rem', borderRadius: '10px', padding: '0.05rem 0.4rem' }}>{bOccupied}/{totalPerBranch}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Stats strip */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Total', val: totalPerBranch, color: 'var(--primary)' },
                  { label: 'Available', val: availableCount, color: '#16a34a' },
                  { label: 'Occupied', val: occupiedCount, color: '#e11d48' },
                  { label: 'Pending requests', val: allLockers.filter(r => r.branch === activeBranch && r.status === 'PENDING').length, color: '#f59e0b' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '0.5rem 1rem', borderRadius: '10px', background: 'var(--panel-soft)', border: '1px solid var(--line)', textAlign: 'center', minWidth: '80px' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', fontSize: '0.76rem' }}>
                {[
                  { label: 'Small (A–B)', color: SIZE_COLOR.Small, bg: SIZE_BG.Small },
                  { label: 'Medium (C–D)', color: SIZE_COLOR.Medium, bg: SIZE_BG.Medium },
                  { label: 'Large (E)', color: SIZE_COLOR.Large, bg: SIZE_BG.Large },
                ].map(l => (
                  <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '16px', height: '16px', borderRadius: '4px', background: l.bg, border: `2px solid ${l.color}`, display: 'inline-block' }} />
                    {l.label}
                  </span>
                ))}
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#f3f4f6', border: '2px solid #9ca3af', display: 'inline-block', textAlign: 'center', lineHeight: '14px', fontSize: '10px' }}>🔒</span>
                  Occupied
                </span>
              </div>

              {/* Theatre-style locker grid */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: '5px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '28px' }} />
                      {COLS.map(c => (
                        <th key={c} style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.72rem', color: 'var(--muted)', width: '56px' }}>{c}</th>
                      ))}
                      <th style={{ paddingLeft: '8px', fontSize: '0.72rem', color: 'var(--muted)', width: '80px', fontWeight: 600 }}>Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((row, ri) => {
                      const sz    = rowSize(ri);
                      const color = SIZE_COLOR[sz];
                      const bg    = SIZE_BG[sz];
                      const rowOccupied = COLS.filter(c => occupied.has(`${row}${c}`)).length;
                      return (
                        <tr key={row}>
                          <td style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--muted)', paddingRight: '6px', textAlign: 'right' }}>{row}</td>
                          {COLS.map(col => {
                            const lockerId = `${row}${col}`;
                            const isOccupied = occupied.has(lockerId);
                            const owner = occupiedMap[lockerId];
                            return (
                              <td key={col}>
                                <div
                                  title={isOccupied
                                    ? `🔒 ${lockerId} — ${owner?.customerName || owner?.customerUsername || 'Assigned'} (${sz})`
                                    : `${lockerId} — ${sz} · Available`}
                                  style={{
                                    width: '52px',
                                    height: '46px',
                                    borderRadius: '7px',
                                    border: `2px solid ${isOccupied ? '#d1d5db' : color}`,
                                    background: isOccupied ? '#f3f4f6' : bg,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: isOccupied ? 'default' : 'default',
                                    fontSize: isOccupied ? '1rem' : '0.72rem',
                                    fontWeight: 700,
                                    color: isOccupied ? '#9ca3af' : color,
                                    lineHeight: 1.2,
                                    transition: 'transform 0.1s',
                                  }}
                                  onMouseEnter={e => { if (!isOccupied) e.currentTarget.style.transform = 'scale(1.08)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                  {isOccupied ? (
                                    <>
                                      <span>🔒</span>
                                      <span style={{ fontSize: '0.55rem', color: '#9ca3af', marginTop: '2px' }}>{lockerId}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{lockerId}</span>
                                      <span style={{ fontSize: '0.5rem', opacity: 0.7 }}>Free</span>
                                    </>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td style={{ paddingLeft: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: color, display: 'inline-block' }} />
                              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{sz}</span>
                              <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>({rowOccupied}/{COLS.length} used)</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {/* Pending requests panel */}
            <SectionCard
              title="Pending Locker Requests"
              subtitle={`${pendingLockers.length} request(s) awaiting assignment`}
            >
              {pendingLockers.length === 0 ? (
                <div className="empty-state">No pending locker requests.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {pendingLockers.map(req => (
                    <div key={req.id} style={{ padding: '1rem 1.25rem', borderRadius: '12px', border: '1.5px solid #fcd34d', background: '#fffbeb', display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '2rem', flexShrink: 0 }}>{req.size === 'Small' ? '🗃️' : req.size === 'Medium' ? '📦' : '🏗️'}</div>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{req.customerName || req.customerUsername}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                          Branch: <strong>{req.branch}</strong> · Size: <strong style={{ color: SIZE_COLOR[req.size] }}>{req.size}</strong>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Requested: {formatDateIN(req.requestedAt)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                        <button className="button button--primary button--sm"
                          onClick={() => { setLockerAssign(req); setLockerBranchView(req.branch); }}>
                          🗺️ Assign from Map
                        </button>
                        <button className="button button--ghost-danger button--sm" onClick={() => declineRequest(req)}>Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Decided requests */}
            {decidedLockers.length > 0 && (
              <SectionCard title="Decided Requests" subtitle={`${decidedLockers.length} resolved request(s)`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {decidedLockers.map(req => (
                    <div key={req.id} style={{ padding: '0.85rem 1.25rem', borderRadius: '10px', border: `1.5px solid ${req.status === 'ASSIGNED' ? '#86efac' : '#fca5a5'}`, background: req.status === 'ASSIGNED' ? '#f0fdf4' : '#fef2f2', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '1.6rem', flexShrink: 0 }}>{req.status === 'ASSIGNED' ? '✅' : '❌'}</div>
                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{req.customerName || req.customerUsername}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                          {req.branch} · {req.size}
                          {req.status === 'ASSIGNED' && req.assignedLocker && <> · <strong style={{ color: SIZE_COLOR[req.size] }}>Locker {req.assignedLocker}</strong></>}
                        </div>
                        {req.adminNote && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                            📝 {req.adminNote}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.18rem 0.55rem', borderRadius: '6px', background: req.status === 'ASSIGNED' ? '#dcfce7' : '#fee2e2', color: req.status === 'ASSIGNED' ? '#16a34a' : '#dc2626', border: `1px solid ${req.status === 'ASSIGNED' ? '#86efac' : '#fca5a5'}` }}>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </>
        );
      })()}

      {/* Locker assignment modal — theatre map for the specific request's branch */}
      {lockerAssign && (() => {
        const ROWS = ['A', 'B', 'C', 'D', 'E'];
        const COLS = [1, 2, 3, 4, 5, 6, 7, 8];
        const rowSize = (ri) => ri < 2 ? 'Small' : ri < 4 ? 'Medium' : 'Large';
        const SIZE_COLOR = { Small: '#3b82f6', Medium: '#f59e0b', Large: '#8b5cf6' };
        const occupied = new Set(
          allLockers
            .filter(r => r.branch === lockerAssign.branch && r.status === 'ASSIGNED' && r.assignedLocker && r.id !== lockerAssign.id)
            .map(r => r.assignedLocker)
        );

        const assignLocker = async (lockerId) => {
          try {
            const res = await api.put(`/locker-requests/admin/${lockerAssign.id}/assign`, { assignedLocker: lockerId, adminNote: lockerNote.trim() || null });
            setAllLockers(prev => prev.map(r => r.id === lockerAssign.id ? (res.data?.data || { ...r, status: 'ASSIGNED', assignedLocker: lockerId, adminNote: lockerNote.trim() }) : r));
            setToast({ message: `Locker ${lockerId} at ${lockerAssign.branch} assigned to ${lockerAssign.customerName || lockerAssign.customerUsername}.`, type: 'success' });
            setLockerAssign(null);
            setLockerNote('');
          } catch {
            setToast({ message: 'Failed to assign locker. Please try again.', type: 'error' });
          }
        };

        return (
          <div className="modal-overlay" onClick={() => setLockerAssign(null)}>
            <div className="modal" style={{ maxWidth: '700px', width: '95%' }} onClick={e => e.stopPropagation()}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>🗺️ Assign Locker — {lockerAssign.branch}</h3>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Assigning for <strong>{lockerAssign.customerName || lockerAssign.customerUsername}</strong> ·
                  Requested: <strong style={{ color: SIZE_COLOR[lockerAssign.size] }}>{lockerAssign.size}</strong>
                </p>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', fontSize: '0.76rem' }}>
                {[
                  { label: `Small (A–B)`, color: SIZE_COLOR.Small },
                  { label: `Medium (C–D)`, color: SIZE_COLOR.Medium },
                  { label: `Large (E)`, color: SIZE_COLOR.Large },
                ].map(l => (
                  <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: l.color + '25', border: `2px solid ${l.color}`, display: 'inline-block' }} />
                    {l.label}
                  </span>
                ))}
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#f3f4f6', border: '2px solid #d1d5db', display: 'inline-block' }} />
                  Occupied
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: SIZE_COLOR[lockerAssign.size] + '30', border: `3px solid ${SIZE_COLOR[lockerAssign.size]}`, display: 'inline-block' }} />
                  Matches requested size — click to assign
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: '5px', marginBottom: '0.5rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '28px' }} />
                      {COLS.map(c => (
                        <th key={c} style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.72rem', color: 'var(--muted)', width: '56px' }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((row, ri) => (
                      <tr key={row}>
                        <td style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--muted)', paddingRight: '6px', textAlign: 'right' }}>{row}</td>
                        {COLS.map(col => {
                          const lockerId  = `${row}${col}`;
                          const isOccupied = occupied.has(lockerId);
                          const sz        = rowSize(ri);
                          const sizeMatch = sz === lockerAssign.size;
                          const color     = SIZE_COLOR[sz];
                          return (
                            <td key={col}>
                              <button
                                disabled={isOccupied}
                                onClick={() => assignLocker(lockerId)}
                                title={isOccupied ? `${lockerId} — Occupied` : `${lockerId} — ${sz}${sizeMatch ? ' ✓ matches your request' : ''}`}
                                style={{
                                  width: '52px',
                                  height: '46px',
                                  borderRadius: '7px',
                                  border: `${sizeMatch && !isOccupied ? '3px' : '2px'} solid ${isOccupied ? '#d1d5db' : color}`,
                                  background: isOccupied ? '#f3f4f6' : sizeMatch ? color + '28' : color + '0d',
                                  color: isOccupied ? '#9ca3af' : color,
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                  cursor: isOccupied ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  lineHeight: 1.2,
                                  transition: 'transform 0.12s, box-shadow 0.12s',
                                  boxShadow: sizeMatch && !isOccupied ? `0 0 0 2px ${color}44` : 'none',
                                }}
                                onMouseEnter={e => { if (!isOccupied) { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = `0 3px 10px ${color}66`; } }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = sizeMatch && !isOccupied ? `0 0 0 2px ${color}44` : 'none'; }}
                              >
                                {isOccupied
                                  ? <><span>🔒</span><span style={{ fontSize: '0.52rem', color: '#9ca3af' }}>{lockerId}</span></>
                                  : <><span style={{ fontSize: '0.82rem', fontWeight: 900 }}>{lockerId}</span><span style={{ fontSize: '0.5rem', opacity: 0.6 }}>{sz.slice(0, 1)}</span></>
                                }
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p style={{ fontSize: '0.77rem', color: 'var(--muted)', margin: '0.25rem 0 1rem' }}>
                Rows A–B = Small · C–D = Medium · E = Large. Click any free locker to assign it instantly.
              </p>

              {/* Admin note */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem' }}>Admin Note (optional)</label>
                <textarea
                  rows={2}
                  value={lockerNote}
                  onChange={e => setLockerNote(e.target.value)}
                  placeholder="e.g. Annual rent of ₹2500. Key handover on branch visit."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '0.85rem', resize: 'vertical', background: 'var(--surface)', color: 'var(--text)' }}
                />
              </div>

              <div className="modal-actions">
                <button className="button button--ghost" onClick={() => { setLockerAssign(null); setLockerNote(''); }}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}



      {adminCardConfirm && (
        <div className="modal-overlay" onClick={() => setAdminCardConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '0.5rem' }}>
              {adminCardConfirm.action === 'block' ? '🚫 Block' : '✅ Unblock'}&nbsp;
              {adminCardConfirm._isCard ? 'Card' : (adminCardConfirm.category?.charAt(0).toUpperCase() + adminCardConfirm.category?.slice(1)) || 'Product'}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              <strong>"{adminCardConfirm.title}"</strong> &mdash; customer <strong>{adminCardConfirm.username}</strong>
            </p>
            <p style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: '1rem' }}>
              {adminCardConfirm.action === 'block'
                ? 'This product will be blocked. The customer will not be able to use it until you unblock it.'
                : 'This product will be unblocked and fully reinstated for the customer.'}
            </p>
            <div className="modal-actions">
              <button className="button button--ghost" onClick={() => setAdminCardConfirm(null)}>Cancel</button>
              <button
                className={adminCardConfirm.action === 'block' ? 'button button--danger' : 'button button--primary'}
                onClick={() => {
                  if (adminCardConfirm._isCard) {
                    doAdminCardAction(`${adminCardConfirm.username}__${adminCardConfirm.title}`, adminCardConfirm.title, adminCardConfirm.action);
                  } else {
                    doProductBlockAction(adminCardConfirm.category, adminCardConfirm.title, adminCardConfirm.action, adminCardConfirm.username);
                  }
                }}
              >
                Confirm {adminCardConfirm.action === 'block' ? 'Block' : 'Unblock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal approval-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="approval-detail-modal__header">
              <div>
                <h3>
                  {viewItem._isProduct
                    ? `${CATEGORY_ICONS[viewItem._productCategory] || '📄'} ${viewItem._productTitle}`
                    : viewItem.customerName}
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  {viewItem._isProduct ? `${viewItem._productCategory.toUpperCase()} application` : 'Account opening request'}
                </p>
              </div>
              <span className="badge badge--info">{categorize(viewItem).toUpperCase()}</span>
            </div>

            <div className="approval-detail-modal__grid">
              <div className="profile-field">
                <div className="profile-field__label">Customer Name</div>
                <div className="profile-field__value">{viewItem.customerName}</div>
              </div>
              {viewItem._isProduct ? (
                <div className="profile-field">
                  <div className="profile-field__label">Username</div>
                  <div className="profile-field__value">{viewItem.username || '—'}</div>
                </div>
              ) : (
                <>
                  <div className="profile-field">
                    <div className="profile-field__label">Email</div>
                    <div className="profile-field__value">{viewItem.emailId}</div>
                  </div>
                  <div className="profile-field">
                    <div className="profile-field__label">Phone</div>
                    <div className="profile-field__value">{viewItem.phoneNo}</div>
                  </div>
                  <div className="profile-field">
                    <div className="profile-field__label">Account Number</div>
                    <div className="profile-field__value">{maskAccount(viewItem.accountNumber) || '—'}</div>
                  </div>
                  <div className="profile-field">
                    <div className="profile-field__label">Opening Deposit</div>
                    <div className="profile-field__value">{formatCurrency(viewItem.openingDeposit)}</div>
                  </div>
                </>
              )}
              <div className="profile-field">
                <div className="profile-field__label">{viewItem._isProduct ? 'Product' : 'Account Type'}</div>
                <div className="profile-field__value">{viewItem.requestedAccountType || '—'}</div>
              </div>
              <div className="profile-field">
                <div className="profile-field__label">Applied On</div>
                <div className="profile-field__value">{formatDate(viewItem.requestedOn)}</div>
              </div>
              <div className="profile-field">
                <div className="profile-field__label">Status</div>
                <div className="profile-field__value">
                  <span className="pill pill--pending">{viewItem.status}</span>
                </div>
              </div>

              {/* Application form data filled by the customer */}
              {viewItem._isProduct && (() => {
                try {
                  const saved = viewItem._formData
                    ? JSON.parse(viewItem._formData)
                    : JSON.parse(localStorage.getItem(`nova_app_${viewItem._storageKey}_${viewItem._productTitle}`) || 'null');
                  if (!saved) return null;
                  const { appliedOn: _a, ...fields } = saved;
                  const entries = Object.entries(fields).filter(([, v]) => v !== '' && v !== null && v !== undefined);
                  if (!entries.length) return null;
                  return (
                    <>
                      <div className="profile-field" style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                        <div className="profile-field__label" style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📋 Application Form Details</div>
                      </div>
                      {entries.map(([k, v]) => (
                        <div key={k} className="profile-field">
                          <div className="profile-field__label">{k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</div>
                          <div className="profile-field__value">{String(v)}</div>
                        </div>
                      ))}
                    </>
                  );
                } catch { return null; }
              })()}
            </div>

            <div className="modal-actions">
              {!viewItem._isProduct && viewItem.customerId && (
                <button className="button button--secondary" onClick={() => { setViewItem(null); navigate(`/admin/customers/${viewItem.customerId}`); }}>
                  View Full Profile →
                </button>
              )}
              <button className="button button--primary" onClick={() => { decide(viewItem, 'approve'); setViewItem(null); }}>Approve</button>
              <button className="button button--ghost-danger" onClick={() => { decide(viewItem, 'decline'); setViewItem(null); }}>Decline</button>
              <button className="button button--ghost" onClick={() => setViewItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
