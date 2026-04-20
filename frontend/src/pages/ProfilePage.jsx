import { useEffect, useState } from 'react';
import { useAutoRefresh } from '../utils/useAutoRefresh';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getPrimaryAccount, setPrimaryAccount } from '../utils/primaryAccount';
import { formatCurrency } from '../utils/formatters';
import { logActivity } from '../utils/activityLog';

const RELATION_LABELS = { FATHER:'Father', MOTHER:'Mother', SPOUSE:'Spouse', CHILD:'Child', SIBLING:'Sibling', OTHER:'Other' };
const GOVT_ID_LABELS  = { PASSPORT:'Passport', NATIONAL_ID:'Aadhaar / National ID', DRIVING_LICENSE:'Driving License', TAX_ID:'PAN / Tax ID' };
const EMPTY_NOMINEE   = { name:'', govtId:'', govtIdType:'NATIONAL_ID', phoneNo:'', relation:'SPOUSE', age:'', dateOfBirth:'', guardianName:'' };

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [nominees, setNominees] = useState([]);
  const [nomineeSearch, setNomineeSearch] = useState('');
  const [toast, setToast] = useState({ message: '', type: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [primaryAccount, setPrimaryAccountState] = useState(() => getPrimaryAccount(user?.username));

  // Nominee modal state
  const [nomineeModal, setNomineeModal] = useState(null); // null | { mode:'add'|'edit', nominee?:{} }
  const [nomineeForm, setNomineeForm] = useState(EMPTY_NOMINEE);
  const [nomineeLoading, setNomineeLoading] = useState(false);

  const load = async () => {
    try {
      const [profileRes, accountsRes] = await Promise.all([
        api.get('/customers/me/profile'),
        api.get('/accounts'),
      ]);
      setProfile(profileRes.data.data);
      const accs = accountsRes.data.data || [];
      setAccounts(accs);
      // Validate stored primary account against actual accounts from server
      // to avoid stale localStorage values crashing the nominees fetch
      const stored = getPrimaryAccount(user?.username);
      const validStored = stored && accs.some(a => a.accountNumber === stored);
      const primaryAccNo = validStored ? stored : accs[0]?.accountNumber;
      if (primaryAccNo) {
        try {
          const nomRes = await api.get('/nominees', { params: { accountNumber: primaryAccNo } });
          setNominees(Array.from(nomRes.data.data || []));
        } catch {
          // nominees fetch failure is non-critical, don't show a blocking toast
        }
      }
    } catch (e) {
      if (e.response?.status !== 403) setToast({ message: e.response?.data?.message || 'Unable to load profile.', type: 'error' });
    }
  };

  useEffect(() => { load(); }, []);
  useAutoRefresh(load, 30000);

  const savePrimary = (accountNumber) => {
    setPrimaryAccount(user?.username, accountNumber);
    setPrimaryAccountState(accountNumber);
    setToast({ message: `Primary account updated to ${accountNumber}.`, type: 'success' });
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return setToast({ message: 'New password and confirm password do not match.', type: 'error' });
    }
    try {
      await api.put('/customers/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      logActivity(user?.username, 'PASSWORD_CHANGED', {});
      localStorage.setItem(`nova_last_pw_change_${user?.username}`, new Date().toISOString());
      setToast({ message: 'Password changed successfully!', type: 'success' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e2) {
      setToast({ message: e2.response?.data?.message || 'Unable to change password.', type: 'error' });
    }
  };

  const openAddNominee = () => {
    setNomineeForm(EMPTY_NOMINEE);
    setNomineeModal({ mode: 'add' });
  };
  const openEditNominee = (n) => {
    setNomineeForm({ name: n.name, govtId: n.govtId, govtIdType: n.govtIdType, phoneNo: n.phoneNo, relation: n.relation, age: n.age != null ? String(n.age) : '', dateOfBirth: n.dateOfBirth || '', guardianName: n.guardianName || '' });
    setNomineeModal({ mode: 'edit', nominee: n });
  };

  const saveNominee = async () => {
    const primaryAccNo = getPrimaryAccount(user?.username) || accounts[0]?.accountNumber;
    if (!primaryAccNo) return setToast({ message: 'No account found to attach nominee.', type: 'error' });
    if (!nomineeForm.name.trim() || !nomineeForm.govtId.trim() || !nomineeForm.phoneNo.trim())
      return setToast({ message: 'Please fill in all required nominee fields.', type: 'error' });
    if (!/^[0-9]{10,15}$/.test(nomineeForm.phoneNo))
      return setToast({ message: 'Phone number must be 10–15 digits.', type: 'error' });
    // Age validation
    if (!nomineeForm.dateOfBirth && nomineeForm.age !== '') {
      const ageNum = Number(nomineeForm.age);
      if (!Number.isInteger(ageNum) || ageNum < 0 || ageNum > 120)
        return setToast({ message: 'Please enter a valid age (0–120).', type: 'error' });
      if (ageNum < 18 && !nomineeForm.guardianName.trim())
        return setToast({ message: 'Nominee is a minor (under 18). A guardian name is required.', type: 'error' });
    }
    if (nomineeForm.dateOfBirth) {
      const dob = new Date(nomineeForm.dateOfBirth);
      const today = new Date();
      const ageYears = (today - dob) / (1000 * 60 * 60 * 24 * 365.25);
      if (ageYears < 0 || dob > today) return setToast({ message: 'Date of birth cannot be in the future.', type: 'error' });
      if (ageYears < 18 && !nomineeForm.guardianName.trim())
        return setToast({ message: 'Nominee is a minor (under 18). A guardian name is required.', type: 'error' });
    }
    setNomineeLoading(true);
    try {
      if (nomineeModal.mode === 'add') {
        await api.post('/nominees', nomineeForm, { params: { accountNumber: primaryAccNo } });
        setToast({ message: 'Nominee added successfully.', type: 'success' });
      } else {
        await api.put(`/nominees/${nomineeModal.nominee.id}`, nomineeForm);
        setToast({ message: 'Nominee updated successfully.', type: 'success' });
      }
      setNomineeModal(null);
      load();
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Unable to save nominee.', type: 'error' });
    } finally {
      setNomineeLoading(false);
    }
  };

  const deleteNominee = async (id) => {
    try {
      await api.delete(`/nominees/${id}`);
      setToast({ message: 'Nominee removed.', type: 'info' });
      load();
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Unable to remove nominee.', type: 'error' });
    }
  };

  const inputStyle = { padding: '0.55rem 0.65rem', borderRadius: '7px', border: '1px solid var(--line)', fontSize: '0.9rem', background: 'var(--panel)', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' };

  return (
    <AppShell role="CUSTOMER" title="My Profile" subtitle="View your profile details and manage security settings.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* Nominee modal */}
      {nomineeModal && (
        <div className="modal-backdrop" onClick={() => setNomineeModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>{nomineeModal.mode === 'add' ? 'Add Nominee' : 'Edit Nominee'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Full name
                <input value={nomineeForm.name} onChange={e => setNomineeForm(p => ({ ...p, name: e.target.value }))} placeholder="Nominee full name" style={inputStyle} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.875rem', fontWeight: 500 }}>
                  Govt ID type
                  <select value={nomineeForm.govtIdType} onChange={e => setNomineeForm(p => ({ ...p, govtIdType: e.target.value }))} style={inputStyle}>
                    {Object.entries(GOVT_ID_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.875rem', fontWeight: 500 }}>
                  Govt ID number
                  <input value={nomineeForm.govtId} onChange={e => setNomineeForm(p => ({ ...p, govtId: e.target.value }))} placeholder="ID number" style={inputStyle} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.875rem', fontWeight: 500 }}>
                  Relation
                  <select value={nomineeForm.relation} onChange={e => setNomineeForm(p => ({ ...p, relation: e.target.value }))} style={inputStyle}>
                    {Object.entries(RELATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.875rem', fontWeight: 500 }}>
                  Phone number
                  <input value={nomineeForm.phoneNo} onChange={e => setNomineeForm(p => ({ ...p, phoneNo: e.target.value }))} placeholder="10–15 digits" style={inputStyle} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.875rem', fontWeight: 500 }}>
                  Age <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(years)</span>
                  <input type="text" inputMode="numeric" maxLength={3} value={nomineeForm.age} onChange={e => setNomineeForm(p => ({ ...p, age: e.target.value.replace(/\D/g, '') }))} placeholder="e.g. 35" style={inputStyle} />
                </label>
                {(nomineeForm.age !== '' && !nomineeForm.dateOfBirth) && (() => {
                  const ageNum = Number(nomineeForm.age);
                  return ageNum >= 0 && ageNum < 18 ? (
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.875rem', fontWeight: 500 }}>
                      <span style={{ color: '#d97706' }}>⚠️ Minor ({ageNum} yrs) — Guardian Name <span style={{ color: '#dc2626' }}>*</span></span>
                      <input value={nomineeForm.guardianName} onChange={e => setNomineeForm(p => ({ ...p, guardianName: e.target.value }))} placeholder="Legal guardian full name" style={{ ...inputStyle, borderColor: '#fcd34d' }} />
                    </label>
                  ) : ageNum >= 18 ? (
                    <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.4rem', fontSize: '0.82rem', color: '#16a34a', fontWeight: 500 }}>✅ Age: {ageNum} yrs — Adult nominee</div>
                  ) : null;
                })()}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.875rem', fontWeight: 500 }}>
                  Date of Birth <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
                  <input type="date" max={new Date().toISOString().slice(0, 10)} value={nomineeForm.dateOfBirth} onChange={e => setNomineeForm(p => ({ ...p, dateOfBirth: e.target.value }))} style={inputStyle} />
                </label>
                {nomineeForm.dateOfBirth && (() => {
                  const dob = new Date(nomineeForm.dateOfBirth);
                  const age = Math.floor((new Date() - dob) / (1000 * 60 * 60 * 24 * 365.25));
                  return age < 18 ? (
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.875rem', fontWeight: 500 }}>
                      <span style={{ color: '#d97706' }}>⚠️ Minor ({age} yrs) — Guardian Name <span style={{ color: '#dc2626' }}>*</span></span>
                      <input value={nomineeForm.guardianName} onChange={e => setNomineeForm(p => ({ ...p, guardianName: e.target.value }))} placeholder="Legal guardian full name" style={{ ...inputStyle, borderColor: '#fcd34d' }} />
                    </label>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.4rem', fontSize: '0.82rem', color: '#16a34a', fontWeight: 500 }}>✅ Age: {age} years — Adult nominee</div>
                  );
                })()}
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
              <button className="button button--secondary" onClick={() => setNomineeModal(null)}>Cancel</button>
              <button className="button button--primary" onClick={saveNominee} disabled={nomineeLoading}>
                {nomineeLoading ? 'Saving…' : nomineeModal.mode === 'add' ? 'Add Nominee' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {profile && (
        <SectionCard title="Personal information" subtitle="Your registered banking profile details.">
          <div className="profile-grid">
            <div className="profile-field"><div className="profile-field__label">Full name</div><div className="profile-field__value">{profile.customerName}</div></div>
            <div className="profile-field"><div className="profile-field__label">User ID</div><div className="profile-field__value">{profile.userId}</div></div>
            <div className="profile-field"><div className="profile-field__label">Email</div><div className="profile-field__value">{profile.emailId}</div></div>
            <div className="profile-field"><div className="profile-field__label">Phone</div><div className="profile-field__value">{profile.phoneNo}</div></div>
            <div className="profile-field"><div className="profile-field__label">Age</div><div className="profile-field__value">{profile.age}</div></div>
            <div className="profile-field"><div className="profile-field__label">Gender</div><div className="profile-field__value">{profile.gender}</div></div>
            <div className="profile-field"><div className="profile-field__label">Government ID</div><div className="profile-field__value">{{ NATIONAL_ID: 'Aadhaar', TAX_ID: 'PAN Card', PASSPORT: 'Passport', DRIVING_LICENSE: 'Driving License' }[profile.govtIdType] || profile.govtIdType}: {profile.govtId}</div></div>
            <div className="profile-field"><div className="profile-field__label">Status</div><div className="profile-field__value"><span className={`pill pill--${profile.status?.toLowerCase()}`}>{profile.status}</span></div></div>
            <div className="profile-field profile-field--wide"><div className="profile-field__label">Address</div><div className="profile-field__value">{profile.addressLine}, {profile.city}, {profile.state} — {profile.postalCode}</div></div>
            {accounts.length > 0 && (
              <div className="profile-field profile-field--wide">
                <div className="profile-field__label">Account Numbers</div>
                <div className="profile-field__value" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {accounts.map(acc => (
                    <span key={acc.accountNumber} className={`pill pill--${acc.status?.toLowerCase()}`} style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {acc.accountNumber} — {acc.accountType}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {accounts.length > 0 && (
        <SectionCard title="Primary account" subtitle="Your default account for UPI payments, transfers, and quick actions.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {accounts.filter(a => a.status === 'ACTIVE').map(acc => {
              const isPrimary = acc.accountNumber === primaryAccount;
              return (
                <div
                  key={acc.accountNumber}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.85rem 1rem', borderRadius: '10px',
                    border: `2px solid ${isPrimary ? 'var(--primary)' : 'var(--line)'}`,
                    background: isPrimary ? 'var(--primary-soft)' : 'var(--panel-soft)',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '2.4rem', height: '2.4rem', borderRadius: '50%', flexShrink: 0,
                      background: isPrimary ? 'var(--primary)' : 'var(--line)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isPrimary ? '#fff' : 'var(--muted)', fontSize: '1.1rem',
                    }}>🏦</div>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem' }}>{acc.accountNumber}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                        {acc.accountType} · {formatCurrency(acc.balance)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                    {isPrimary
                      ? <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-soft)', padding: '0.2rem 0.6rem', borderRadius: '99px', border: '1px solid var(--primary)' }}>✓ Primary</span>
                      : <button className="button button--secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }} onClick={() => savePrimary(acc.accountNumber)}>Set as primary</button>
                    }
                  </div>
                </div>
              );
            })}
            {accounts.filter(a => a.status === 'ACTIVE').length === 0 && (
              <div className="empty-state">No active accounts available.</div>
            )}
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>
              Your primary account is used as the default source for UPI payments and fund transfers.
            </p>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Change password" subtitle="Update your internet banking password. Use the ⌨ virtual keyboard button at the bottom-left.">
        <form className="password-form" onSubmit={changePassword} style={{ marginTop: '0.5rem' }}>
          <label>
            <span>Current password</span>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
              placeholder="Enter current password"
            />
          </label>
          <label>
            <span>New password</span>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
              placeholder="At least 8 characters"
            />
          </label>
          <label>
            <span>Confirm new password</span>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
              placeholder="Re-enter new password"
            />
          </label>
          <div style={{ display: 'flex', alignItems: 'end', gap: '0.5rem' }}>
            <button className="button button--primary">Update password</button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Nominees" subtitle="Add or update nominees for your account. Maximum 2 nominees allowed.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {nominees.length > 0 && (
            <input
              placeholder="Search by name, relation or phone…"
              value={nomineeSearch}
              onChange={e => setNomineeSearch(e.target.value)}
              style={{ maxWidth: '320px' }}
            />
          )}
          {(() => {
            const q = nomineeSearch.trim().toLowerCase();
            const filtered = nominees.filter(n =>
              !q ||
              n.name?.toLowerCase().includes(q) ||
              n.relation?.toLowerCase().includes(q) ||
              n.phoneNo?.toLowerCase().includes(q)
            );
            if (nominees.length === 0) return <div className="empty-state" style={{ margin: '0.5rem 0 1rem' }}>No nominees added yet.</div>;
            if (filtered.length === 0) return <div className="empty-state" style={{ margin: '0.5rem 0 1rem' }}>No nominees match your search.</div>;
            return filtered.map(n => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.9rem 1rem', borderRadius: '10px', border: '1.5px solid var(--line)', background: 'var(--panel-soft)', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>👤</div>
              <div style={{ flex: 1, minWidth: '160px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{n.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                  {RELATION_LABELS[n.relation] || n.relation} · {GOVT_ID_LABELS[n.govtIdType] || n.govtIdType}: {n.govtId} · 📞 {n.phoneNo}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <button className="button button--secondary button--sm" style={{ fontSize: '0.78rem' }} onClick={() => openEditNominee(n)}>✏️ Edit</button>
                <button className="button button--ghost button--sm" style={{ fontSize: '0.78rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => deleteNominee(n.id)}>🗑 Remove</button>
              </div>
            </div>
            ));
          })()}
          {nominees.length < 2 && (
            <button className="button button--primary button--sm" style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }} onClick={openAddNominee}>
              + Add Nominee {nominees.length > 0 ? `(${nominees.length}/2)` : ''}
            </button>
          )}
          {nominees.length >= 2 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>Maximum 2 nominees allowed. Remove one to add another.</p>
          )}
        </div>
      </SectionCard>
    </AppShell>
  );
}
