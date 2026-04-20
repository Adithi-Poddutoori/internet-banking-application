import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { logActivity } from '../utils/activityLog';

const AuthContext = createContext(null);
const STORAGE_KEY = 'nova-bank-auth';
const TIMEOUT_MS = 15 * 60 * 1000;   // 15 minutes idle
const WARN_MS   = 2  * 60 * 1000;    // warn at 2 minutes left

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [sessionWarning, setSessionWarning] = useState(false);
  const idleTimer  = useRef(null);
  const warnTimer  = useRef(null);

  const clearTimers = () => {
    clearTimeout(idleTimer.current);
    clearTimeout(warnTimer.current);
  };

  const resetTimers = () => {
    clearTimers();
    if (!user) return;
    setSessionWarning(false);
    warnTimer.current = setTimeout(() => setSessionWarning(true), TIMEOUT_MS - WARN_MS);
    idleTimer.current = setTimeout(() => {
      setUser(null);
      setSessionWarning(false);
    }, TIMEOUT_MS);
  };

  // Start timers when user logs in, stop when logged out
  useEffect(() => {
    if (!user) { clearTimers(); setSessionWarning(false); return; }
    resetTimers();
    const EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handler = () => resetTimers();
    EVENTS.forEach(e => window.addEventListener(e, handler, { passive: true }));
    return () => {
      clearTimers();
      EVENTS.forEach(e => window.removeEventListener(e, handler));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    sessionWarning,
    login: (authData) => {
      logActivity(authData?.username, 'LOGIN', { role: authData?.role });
      setUser(authData);
    },
    logout: () => setUser(null),
    keepAlive: () => resetTimers(),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, sessionWarning]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
