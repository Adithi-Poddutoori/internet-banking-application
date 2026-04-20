import { useState } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';

const SETTINGS_KEY = 'nova_admin_settings';

function ls(key, fb = {}) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fb)); } catch { return fb; }
}
function sw(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

const DEFAULTS = {
  savingsRate:            3.5,
  fdRate1yr:              6.8,
  fdRate2yr:              7.0,
  fdRate3yr:              7.2,
  txnLimitPerDay:         100000,
  upiLimitPerTxn:         100000,
  upiDailyLimit:          200000,
  minBalance:             1000,
};

const ALL_LS_KEYS = [
  'nova_bills', 'nova_expenses',
  'nova_expenses_imported', 'novabank_products', 'novabank_product_history',
  'nova_loan_prepayments', 'nova_redemption_history', 'nova_redeemed_pts',
  'nova_stopped_cheques', 'nova_admin_settings', 'nova_admin_broadcasts',
  'nova_admin_flagged_txns', 'nova_admin_held_txns', 'nova_notif_unread',
  'nova_activity_log', 'nova_primary_account',
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(() => ({ ...DEFAULTS, ...ls(SETTINGS_KEY) }));
  const [clearConfirm, setClearConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });

  const clearAllData = () => {
    ALL_LS_KEYS.forEach(k => localStorage.removeItem(k));
    setClearConfirm(false);
    setToast({ message: 'All stored customer data cleared. Refresh the page to see changes.', type: 'success' });
  };

  const update = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  const save = () => {
    sw(SETTINGS_KEY, settings);
    setSaved(true);
    setToast({ message: 'Settings saved successfully.', type: 'success' });
    setTimeout(() => setSaved(false), 2500);
  };

  const reset = () => {
    setSettings({ ...DEFAULTS });
    setToast({ message: 'Settings reset to defaults. Click Save to persist.', type: 'success' });
  };

  /* ── Sub-components ─────────────────────────────────────────── */
  const Field = ({ label, helpText, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 0', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: '0.5rem' }}>
      <div style={{ flex: 1, minWidth: '220px' }}>
        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{label}</div>
        {helpText && <div style={{ fontSize: '0.73rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{helpText}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );

  const NumberInput = ({ settingKey, suffix = '', min = 0, max, step = 1 }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
      <input
        type="number" min={min} max={max} step={step}
        value={settings[settingKey]}
        onChange={e => update(settingKey, parseFloat(e.target.value) || 0)}
        style={{ width: '120px', padding: '0.45rem 0.6rem', borderRadius: '7px', border: '1px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel)', textAlign: 'right' }}
      />
      {suffix && <span style={{ fontSize: '0.82rem', color: 'var(--muted)', minWidth: '40px' }}>{suffix}</span>}
    </div>
  );

  return (
    <AppShell role="ADMIN" title="System Settings" subtitle="Configure interest rates, transaction limits, and system behaviour.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* Interest Rates */}
      <SectionCard title="Interest Rates" subtitle="Annual rates applied to savings accounts and fixed deposits.">
        <Field label="Savings Account Rate" helpText="Standard annual interest rate for all savings accounts.">
          <NumberInput settingKey="savingsRate" suffix="% p.a." step={0.05} min={0} max={20} />
        </Field>
        <Field label="Fixed Deposit — 1 Year" helpText="FD interest rate for a 1-year tenure.">
          <NumberInput settingKey="fdRate1yr" suffix="% p.a." step={0.05} min={0} max={20} />
        </Field>
        <Field label="Fixed Deposit — 2 Years" helpText="FD interest rate for a 2-year tenure.">
          <NumberInput settingKey="fdRate2yr" suffix="% p.a." step={0.05} min={0} max={20} />
        </Field>
        <Field label="Fixed Deposit — 3 Years" helpText="FD interest rate for a 3+ year tenure.">
          <NumberInput settingKey="fdRate3yr" suffix="% p.a." step={0.05} min={0} max={20} />
        </Field>
      </SectionCard>

      {/* Transaction Limits */}
      <SectionCard title="Transaction Limits" subtitle="Maximum amounts allowed per transaction and per day." style={{ marginTop: '1.5rem' }}>
        <Field label="Daily Transaction Limit" helpText="Maximum total transfer amount a customer can perform in one day.">
          <NumberInput settingKey="txnLimitPerDay" suffix="₹" step={5000} min={1000} />
        </Field>
        <Field label="UPI Limit per Transaction" helpText="Maximum amount allowed per single UPI transfer.">
          <NumberInput settingKey="upiLimitPerTxn" suffix="₹" step={5000} min={1000} />
        </Field>
        <Field label="UPI Daily Limit" helpText="Total UPI transaction value allowed in a single day.">
          <NumberInput settingKey="upiDailyLimit" suffix="₹" step={10000} min={5000} />
        </Field>
        <Field label="Minimum Account Balance" helpText="Minimum balance that must be maintained in a savings account.">
          <NumberInput settingKey="minBalance" suffix="₹" step={100} min={0} />
        </Field>
      </SectionCard>

      {/* Data Management */}
      <SectionCard title="Data Management" subtitle="Clear all locally stored customer data — bills, transfers, products, expenses, rewards and more." style={{ marginTop: '1.5rem' }}>
        <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Clear All Stored Data</div>
            <div style={{ fontSize: '0.73rem', color: 'var(--muted)', marginTop: '0.1rem' }}>Removes all bills, expenses, product applications, loan prepayments, redemptions and admin flags from the browser. Cannot be undone.</div>
          </div>
          {!clearConfirm ? (
            <button
              onClick={() => setClearConfirm(true)}
              style={{ padding: '0.45rem 1rem', borderRadius: '8px', border: '1.5px solid #fca5a5', color: '#e11d48', background: '#fef2f2', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', flexShrink: 0 }}>
              Clear All Data
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{ fontSize: '0.82rem', color: '#991b1b', fontWeight: 600, alignSelf: 'center' }}>Are you sure?</span>
              <button onClick={clearAllData} style={{ padding: '0.4rem 0.9rem', borderRadius: '7px', border: 'none', background: '#e11d48', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>Yes, clear</button>
              <button onClick={() => setClearConfirm(false)} style={{ padding: '0.4rem 0.9rem', borderRadius: '7px', border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.75rem' }}>
        <button className="button button--primary" onClick={save}>
          {saved ? '✅ Saved!' : ' Save Settings'}
        </button>
        <button className="button button--ghost" onClick={reset}>↩ Reset to Defaults</button>
      </div>
    </AppShell>
  );
}
