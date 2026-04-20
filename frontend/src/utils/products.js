import api from '../services/api';

const STORAGE_KEY = 'novabank_products';
const HISTORY_KEY = 'novabank_product_history';

function getAuthUser() {
  try {
    const raw = localStorage.getItem('nova-bank-auth');
    if (!raw) return null;
    return JSON.parse(raw) || null;
  } catch { return null; }
}

// Categories that are customer-activated — stored in a per-user key so they
// survive other users logging in on the same device.
const LOCAL_ONLY_CATEGORIES = new Set(['benefits', 'rewards']);

function localOnlyKey(category) {
  const u = getAuthUser();
  const username = u?.username || 'guest';
  return `novabank_local_${category}_${username}`;
}

function getLocalOnlyProducts(category) {
  try { return JSON.parse(localStorage.getItem(localOnlyKey(category)) || '[]'); } catch { return []; }
}

function setLocalOnlyProducts(category, list) {
  localStorage.setItem(localOnlyKey(category), JSON.stringify(list));
}

export function getProducts() {
  try {
    const base = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    // Merge in per-user local-only categories so consumers see a unified object
    for (const cat of LOCAL_ONLY_CATEGORIES) {
      const list = getLocalOnlyProducts(cat);
      if (list.length) base[cat] = list;
      else delete base[cat];
    }
    return base;
  } catch { return {}; }
}

export function hasProduct(category, title) {
  return (getProducts()[category] || []).some(p => p.title === title);
}

export function getCategoryProducts(category) {
  return getProducts()[category] || [];
}

export function getProductHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch { return []; }
}

// ── Writes: update localStorage immediately AND persist to backend ────────────

export function addProduct(category, title) {
  if (LOCAL_ONLY_CATEGORIES.has(category)) {
    // Store in per-user key — never touches novabank_products
    const list = getLocalOnlyProducts(category);
    if (!list.find(p => p.title === title)) {
      const user = getAuthUser();
      list.push({
        title,
        appliedOn: new Date().toISOString(),
        customerName: user?.displayName || user?.customerName || user?.username || '',
        username: user?.username || '',
      });
      setLocalOnlyProducts(category, list);
    }
    return getProducts();
  }
  const products = getProducts();
  if (!products[category]) products[category] = [];
  if (!products[category].find(p => p.title === title)) {
    const user = getAuthUser();
    products[category].push({
      title,
      appliedOn: new Date().toISOString(),
      customerName: user?.displayName || user?.customerName || user?.username || '',
      username: user?.username || '',
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    // Only submit to backend for categories that need admin approval
    if (!LOCAL_ONLY_CATEGORIES.has(category)) {
      api.post('/product-requests', { category, productTitle: title }).catch(() => {});
    }
  }
  return products;
}

/** Like addProduct but allows multiple entries with the same title. */
export function addProductMultiple(category, title) {
  const products = getProducts();
  if (!products[category]) products[category] = [];
  const user = getAuthUser();
  const count = products[category].filter(p => p.title === title).length;
  products[category].push({
    title,
    appliedOn: new Date().toISOString(),
    customerName: user?.displayName || user?.customerName || user?.username || '',
    username: user?.username || '',
    _instance: count + 1,
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  api.post('/product-requests', { category, productTitle: title }).catch(() => {});
  return products;
}

/** Count pending applications for a given title in a category. */
export function countPendingProduct(category, title) {
  return (getProducts()[category] || []).filter(p => p.title === title).length;
}

export function removeProduct(category, title) {
  const products = getProducts();
  if (!products[category]) return products;
  products[category] = products[category].filter(p => p.title !== title);
  if (products[category].length === 0) delete products[category];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  return products;
}

export function addProductHistory(category, title, decision, customerName = '', username = '') {
  const history = getProductHistory();
  history.unshift({
    category,
    title,
    decision,
    decidedOn: new Date().toISOString(),
    customerName: customerName || '',
    username: username || '',
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

export function removeProductHistory(category, title) {
  const history = getProductHistory().filter(h => !(h.category === category && h.title === title));
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

/** Persist a stopped investment title so syncProductsFromBackend won't restore it. */
export function addStoppedInvestment(title) {
  try {
    const user = getAuthUser();
    const key = `nova_stopped_investments_${user?.username || 'guest'}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (!existing.includes(title)) {
      existing.push(title);
      localStorage.setItem(key, JSON.stringify(existing));
    }
  } catch { /* ignore */ }
}

export function getStoppedInvestments() {
  try {
    const user = getAuthUser();
    const key = `nova_stopped_investments_${user?.username || 'guest'}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}

// ── Backend sync helpers ──────────────────────────────────────────────────────

/**
 * Called on customer page load. Fetches all product requests from the backend
 * and rebuilds localStorage so the customer sees correct status even after
 * using a different browser or clearing cache.
 */
export async function syncProductsFromBackend() {
  try {
    const { data } = await api.get('/product-requests/my');
    const items = data?.data || [];

    const products = {};
    const history = [];

    const currentUser = getAuthUser();
    const stopped = (() => { try { return JSON.parse(localStorage.getItem(`nova_stopped_investments_${currentUser?.username || 'guest'}`) || '[]'); } catch { return []; } })();

    for (const item of items) {
      const { category, productTitle, status, customerName, customerUsername, appliedOn, decidedOn } = item;
      // Skip investments the customer has explicitly stopped
      if (category === 'investments' && stopped.includes(productTitle)) continue;
      if (status === 'PENDING') {
        if (!products[category]) products[category] = [];
        if (!products[category].find(p => p.title === productTitle)) {
          products[category].push({ title: productTitle, appliedOn, customerName, username: customerUsername });
        }
      } else {
        // APPROVED or DECLINED → goes to history
        if (!history.find(h => h.category === category && h.title === productTitle)) {
          history.push({ category, title: productTitle, decision: status, decidedOn, customerName, username: customerUsername });
        }
      }
    }

    // Preserve local-only categories from per-user keys — backend knows nothing about them
    for (const cat of LOCAL_ONLY_CATEGORIES) {
      // getLocalOnlyProducts reads using the current auth user — which is set by the time
      // syncProductsFromBackend is called after login
      const userList = getLocalOnlyProducts(cat);
      if (userList.length) products[cat] = userList;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch { /* network unavailable — silently keep existing localStorage */ }
}



