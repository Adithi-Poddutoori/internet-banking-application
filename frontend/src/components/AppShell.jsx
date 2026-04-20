import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Breadcrumbs from './Breadcrumbs';
import VirtualKeyboard from './VirtualKeyboard';
import GlobalSearch from './GlobalSearch';
import api from '../services/api';
import { syncProductsFromBackend } from '../utils/products';

export default function AppShell({ role, title, subtitle, children }) {
  const { user, logout, sessionWarning, keepAlive } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [vkbVisible, setVkbVisible] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [terminationNoticeDate, setTerminationNoticeDate] = useState(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [pwChangePrompt, setPwChangePrompt] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(() => {
    try { return parseInt(localStorage.getItem('nova_notif_unread') || '0', 10); } catch { return 0; }
  });
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  // Global search keyboard shortcut: Ctrl+K or /
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'nova_notif_unread') {
        setUnreadNotifCount(parseInt(e.newValue || '0', 10));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Fetch termination notice from backend for customers
  useEffect(() => {
    if (role !== 'CUSTOMER') return;
    api.get('/customers/me').then(({ data }) => {
      const d = data?.data?.terminationNoticeDate;
      if (d) setTerminationNoticeDate(new Date(d));
    }).catch(() => {});
  }, [role]);

  // Sync product request statuses from backend → localStorage so cross-browser status is always current
  useEffect(() => {
    if (role !== 'CUSTOMER' || !user?.username) return;
    syncProductsFromBackend().catch(() => {});
  }, [role, user?.username]);

  // Password change reminder — prompt if no change recorded in last 90 days
  useEffect(() => {
    if (role !== 'CUSTOMER' || !user?.username) return;
    const key = `nova_last_pw_change_${user.username}`;
    const last = localStorage.getItem(key);
    const dismissed = localStorage.getItem(`${key}_dismissed_until`);
    if (dismissed && new Date(dismissed) > new Date()) return; // snoozed
    const daysSince = last
      ? Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000)
      : 91; // no record → treat as overdue
    if (daysSince >= 90) setPwChangePrompt(true);
  }, [role, user?.username]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = useMemo(() => {
    return role === 'ADMIN'
      ? [
          ['Dashboard', '/admin'],
          ['Approvals', '/admin/approvals'],
          ['Customers', '/admin/customers'],
          ['Complaints', '/admin/complaints'],
          ['Transactions', '/admin/transactions'],
          ['Staff', '/admin/staff'],
          ['Settings', '/admin/settings'],
        ]
      : [
          ['Dashboard', '/customer'],
          ['Accounts', '/customer/accounts'],
          ['Beneficiaries', '/customer/beneficiaries'],
          ['Rewards', '/customer/rewards'],
          ['Loans', '/customer/loans'],
          ['Investments', '/customer/investments'],
          ['Deposits', '/customer/deposits'],
          ['Insurance', '/customer/insurance'],
          ['Cards', '/customer/cards'],
          ['Bills', '/customer/bills'],
          ['Expenses', '/customer/expenses'],
          ['Credit Score', '/customer/credit-score'],
          ['Complaints', '/customer/complaints'],
          ['Services', '/customer/passbook'],
        ];
  }, [role]);

  const isActive = useCallback((path) => {
    if (path === '/customer' || path === '/admin') return location.pathname === path;
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const handleDismissNotice = () => {
    setNoticeDismissed(true);
  };

  return (
    <div className="app-shell">

      {/* ── TOP NAVBAR ── */}
      <nav className="navbar">

        {/* ── ROW 1: Brand + user controls ── */}
        <div className="navbar__top">
          <div className="navbar__top-inner">
            <div className="navbar__brand" onClick={() => navigate(role === 'ADMIN' ? '/admin' : '/customer')}>
              <span className="navbar__brand-mark">N</span>
              <span className="navbar__brand-name">Nova Bank</span>
            </div>
            <div className="navbar__top-right">
              {/* Search button */}
              <button
                className="navbar__search-btn"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <span className="navbar__search-hint">Search</span>
                <span className="navbar__search-kbd">Ctrl K</span>
              </button>

              {/* Notification bell — customers only */}
              {role === 'CUSTOMER' && (
                <button
                  className="navbar__notif-btn"
                  onClick={() => navigate('/customer/notifications')}
                  aria-label="Notifications"
                  style={{ position: 'relative' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  {(terminationNoticeDate && !noticeDismissed) || unreadNotifCount > 0
                    ? <span className="navbar__notif-badge" style={{ background: unreadNotifCount > 0 ? '#f59e0b' : '#ef4444' }} />
                    : null}
                </button>
              )}

              {/* User dropdown */}
              <div className="navbar__user-wrap" ref={dropdownRef}>
                <button className="navbar__user-btn" onClick={() => setDropdownOpen(o => !o)}>
                  <div className="navbar__avatar">{(user?.displayName || user?.username || 'U').slice(0, 1)}</div>
                  <span className="navbar__user-name">{user?.displayName || user?.username}</span>
                  <span className={`navbar__caret${dropdownOpen ? ' navbar__caret--open' : ''}`}>▾</span>
                </button>
                {dropdownOpen && (
                  <div className="navbar__dropdown">
                    <button className="navbar__dropdown-item" onClick={() => { setDropdownOpen(false); navigate(role === 'ADMIN' ? '/admin' : '/customer'); }}>
                      🏠 Dashboard
                    </button>
                    {role === 'ADMIN' && (
                      <button className="navbar__dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/admin/profile'); }}>
                        👤 My Profile
                      </button>
                    )}
                    {role !== 'ADMIN' && (
                      <button className="navbar__dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/customer/accounts'); }}>
                        💳 My Accounts
                      </button>
                    )}
                    {role !== 'ADMIN' && (
                      <button className="navbar__dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/customer/profile'); }}>
                        👤 My Profile
                      </button>
                    )}
                    <div className="navbar__dropdown-sep" />
                    <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={logout}>
                      🚪 Sign Out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile hamburger */}
              <button className="navbar__hamburger" ref={menuRef} onClick={() => setMenuOpen(o => !o)} aria-label="Open menu">
                <span /><span /><span />
              </button>
            </div>
          </div>
        </div>

        {/* ── ROW 2: Navigation links ── */}
        <div className="navbar__nav">
          <div className="navbar__nav-inner">
            <div className="navbar__links">
              {navItems.map(([name, path]) => (
                <button
                  key={path}
                  className={`navbar__link${isActive(path) ? ' navbar__link--active' : ''}`}
                  onClick={() => navigate(path)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Mobile menu ── */}
        {menuOpen && (
          <div className="navbar__mobile-menu">
            {navItems.map(([name, path]) => (
              <button
                key={path}
                className={`navbar__mobile-link${isActive(path) ? ' navbar__mobile-link--active' : ''}`}
                onClick={() => { navigate(path); setMenuOpen(false); }}
              >
                {name}
              </button>
            ))}
            <div className="navbar__mobile-sep" />
            {role !== 'ADMIN' && (
              <button className="navbar__mobile-link" onClick={() => { navigate('/customer/accounts'); setMenuOpen(false); }}>My Accounts</button>
            )}
            {role !== 'ADMIN' && (
              <button className="navbar__mobile-link" onClick={() => { navigate('/customer/profile'); setMenuOpen(false); }}>My Profile</button>
            )}
            <div className="navbar__mobile-sep" />
            <button className="navbar__mobile-link navbar__mobile-link--danger" onClick={logout}>Sign Out</button>
          </div>
        )}
      </nav>

      {/* ── SESSION TIMEOUT WARNING BANNER ── */}
      {sessionWarning && (
        <div style={{ background: '#7c3aed', color: '#fff', padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
          <span>⏱️ Your session will expire in 2 minutes due to inactivity.</span>
          <button onClick={keepAlive} style={{ background: '#fff', color: '#7c3aed', border: 'none', borderRadius: '6px', padding: '0.25rem 0.75rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>Stay logged in</button>
        </div>
      )}

      {/* ── PASSWORD CHANGE REMINDER BANNER ── */}
      {pwChangePrompt && role === 'CUSTOMER' && (
        <div style={{ background: '#fef9c3', borderBottom: '1px solid #fde047', padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.1rem' }}>🔑</span>
          <span style={{ flex: 1, fontSize: '0.875rem', color: '#713f12', fontWeight: 500 }}>
            It has been a while since you last changed your password. We recommend updating it regularly to keep your account secure.
          </span>
          <button
            className="button button--sm button--primary"
            style={{ fontSize: '0.78rem', flexShrink: 0 }}
            onClick={() => { setPwChangePrompt(false); navigate('/customer/profile'); }}
          >
            Change Password
          </button>
          <button
            className="button button--sm button--ghost"
            style={{ fontSize: '0.78rem', flexShrink: 0 }}
            onClick={() => {
              // Snooze for 7 days
              const until = new Date(); until.setDate(until.getDate() + 7);
              localStorage.setItem(`nova_last_pw_change_${user?.username}_dismissed_until`, until.toISOString());
              setPwChangePrompt(false);
            }}
          >
            Remind me later
          </button>
        </div>
      )}

      {/* ── TERMINATION NOTICE BANNER ── */}
      {role === 'CUSTOMER' && terminationNoticeDate && !noticeDismissed && (() => {
        const minDate = new Date(terminationNoticeDate); minDate.setDate(minDate.getDate() + 14);
        const maxDate = new Date(terminationNoticeDate); maxDate.setDate(maxDate.getDate() + 21);
        const fmt = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const daysLeft = Math.max(0, Math.ceil((maxDate - new Date()) / 86400000));
        return (
          <div className="termination-banner">
            <span className="termination-banner__icon">⚠️</span>
            <div className="termination-banner__body">
              <strong>Account Inactivity Notice</strong>
              <span>Your account has been flagged as inactive. If no activity is recorded, it will be closed between <strong>{fmt(minDate)}</strong> and <strong>{fmt(maxDate)}</strong> ({daysLeft} days remaining). Please contact support or make a transaction to keep your account active.</span>
            </div>
            <button className="termination-banner__dismiss" onClick={handleDismissNotice} aria-label="Dismiss">✕</button>
          </div>
        );
      })()}

      {/* ── MAIN PANEL ── */}
      <main className="main-panel">
        <div className="page-header">
          <Breadcrumbs />
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__sub">{subtitle}</p>}
        </div>

        <section className="dashboard-content">
          {children}
        </section>
      </main>

      <footer className="app-footer">
        <div className="app-footer__grid">
          <div className="app-footer__col">
            <div className="app-footer__heading">Nova Bank</div>
            <p>Secure, trusted internet banking for every Indian. RBI regulated and DICGC insured.</p>
          </div>
          <div className="app-footer__col">
            <div className="app-footer__heading">Quick Links</div>
            <a className="app-footer__link" onClick={() => navigate(role === 'ADMIN' ? '/admin' : '/customer')}>Dashboard</a>
            {role !== 'ADMIN' && <a className="app-footer__link" onClick={() => navigate('/customer/accounts')}>My Accounts</a>}
            {role !== 'ADMIN' && <a className="app-footer__link" onClick={() => navigate('/customer/transfer')}>Fund Transfer</a>}
            {role !== 'ADMIN' && <a className="app-footer__link" onClick={() => navigate('/customer/loans')}>Loans</a>}
            {role !== 'ADMIN' && <a className="app-footer__link" onClick={() => navigate('/customer/profile')}>My Profile</a>}
            {role !== 'CUSTOMER' && <a className="app-footer__link" onClick={() => navigate('/admin/approvals')}>Approvals</a>}
            {role !== 'CUSTOMER' && <a className="app-footer__link" onClick={() => navigate('/admin/customers')}>Customers</a>}
          </div>
          <div className="app-footer__col">
            <div className="app-footer__heading">Security &amp; Compliance</div>
            <span className="app-footer__badge">256-bit SSL Encrypted</span>
            <span className="app-footer__badge">DICGC Insured up to ₹5,00,000</span>
            <span className="app-footer__badge">RBI Regulated Entity</span>
            <span className="app-footer__badge">JWT-secured Session</span>
          </div>
          <div className="app-footer__col">
            <div className="app-footer__heading">Contact</div>
            <span>📞 1800-208-1234 (Toll Free)</span>
            <span>✉️ support@novabank.in</span>
            <span>📍 Bengaluru, Karnataka, India</span>
            <span>Mon – Sat: 9 AM – 6 PM</span>
          </div>
        </div>
        <div className="app-footer__bottom">
          <span>© 2026 Nova Bank Ltd. All rights reserved. | CIN: L65191MH1996PLC108969</span>
          <span>Investments are subject to market risk. Read all scheme documents carefully.</span>
        </div>
      </footer>

      <GlobalSearch role={role} open={searchOpen} onClose={() => setSearchOpen(false)} />

      <VirtualKeyboard visible={vkbVisible} onToggle={() => setVkbVisible(v => !v)} />
    </div>
  );
}
