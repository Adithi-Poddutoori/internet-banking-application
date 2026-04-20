import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CUSTOMER_ITEMS = [
  { label: 'Dashboard', path: '/customer', keywords: 'home overview summary' },
  { label: 'My Accounts', path: '/customer/accounts', keywords: 'savings balance account portfolio linked' },
  { label: 'Fund Transfer', path: '/customer/transfer', keywords: 'send money transfer neft imps rtgs upi' },
  { label: 'Transactions', path: '/customer/transactions', keywords: 'history statement credit debit' },
  { label: 'Beneficiaries', path: '/customer/beneficiaries', keywords: 'beneficiary saved contacts payee' },
  { label: 'Rewards', path: '/customer/rewards', keywords: 'cashback points loyalty redeeem' },
  { label: 'Loans', path: '/customer/loans', keywords: 'home car personal education business gold loan emi' },
  { label: 'Investments', path: '/customer/investments', keywords: 'mutual fund sip equity stocks portfolio invest' },
  { label: 'Fixed Deposits', path: '/customer/deposits', keywords: 'fd fixed deposit term recurring' },
  { label: 'Insurance', path: '/customer/insurance', keywords: 'life health motor vehicle term cover' },
  { label: 'Cards', path: '/customer/cards', keywords: 'credit debit virtual international card' },
  { label: 'Passbook & Chequebook', path: '/customer/passbook', keywords: 'passbook chequebook cheque services request' },
  { label: 'My Profile', path: '/customer/profile', keywords: 'profile kyc details update address' },
  { label: 'Notifications', path: '/customer/notifications', keywords: 'alerts notice alerts bell' },
];

const ADMIN_ITEMS = [
  { label: 'Admin Dashboard', path: '/admin', keywords: 'home overview summary stats' },
  { label: 'Approvals', path: '/admin/approvals', keywords: 'pending approve decline applications' },
  { label: 'Reports', path: '/admin/reports', keywords: 'transaction report download interest calculator' },
  { label: 'Customers', path: '/admin/customers', keywords: 'customers search list portfolio' },
  { label: 'My Profile', path: '/admin/profile', keywords: 'admin profile details' },
];

export default function GlobalSearch({ role, open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const items = role === 'ADMIN' ? ADMIN_ITEMS : CUSTOMER_ITEMS;

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q)
    );
  }, [query, items]);

  const go = (path) => {
    navigate(path);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="gsearch-backdrop" onClick={onClose}>
      <div className="gsearch-box" onClick={e => e.stopPropagation()}>
        <div className="gsearch-input-wrap">
          <span className="gsearch-icon">🔍</span>
          <input
            ref={inputRef}
            className="gsearch-input"
            placeholder="Search pages, features, actions…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && results.length > 0) go(results[0].path); }}
          />
          {query && (
            <button className="gsearch-clear" onClick={() => setQuery('')}>✕</button>
          )}
        </div>
        <div className="gsearch-results">
          {results.length === 0 ? (
            <div className="gsearch-empty">No results for "{query}"</div>
          ) : results.map((item, i) => (
            <button key={i} className="gsearch-result-item" onClick={() => go(item.path)}>
              <span className="gsearch-result-label">{item.label}</span>
              <span className="gsearch-result-path">{item.path}</span>
            </button>
          ))}
        </div>
        <div className="gsearch-footer">
          <span>↵ to navigate</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
