import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toTitleCase } from '../utils/formatters';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

function useTypingEffect(phrases, speed = 60, pause = 2000) {
  const [text, setText] = useState('');
  const idx = useRef(0);
  const charIdx = useRef(0);
  const deleting = useRef(false);

  useEffect(() => {
    const tick = () => {
      const current = phrases[idx.current];
      if (!deleting.current) {
        charIdx.current++;
        setText(current.slice(0, charIdx.current));
        if (charIdx.current === current.length) {
          deleting.current = true;
          return setTimeout(tick, pause);
        }
      } else {
        charIdx.current--;
        setText(current.slice(0, charIdx.current));
        if (charIdx.current === 0) {
          deleting.current = false;
          idx.current = (idx.current + 1) % phrases.length;
        }
      }
      return setTimeout(tick, deleting.current ? speed / 2 : speed);
    };
    const timer = tick();
    return () => clearTimeout(timer);
  }, [phrases, speed, pause]);

  return text;
}

const HERO_PHRASES = [
  'Secure online banking built for you.',
  'Transfer funds instantly, 24×7.',
  'Track balances and investments.',
  'Banking, reimagined.'
];

const defaultRegistration = {
  customerName: '',
  phoneNo: '',
  emailId: '',
  age: 18,
  gender: 'MALE',
  govtId: '',
  govtIdType: 'NATIONAL_ID',
  addressLine: '',
  city: '',
  state: '',
  postalCode: '',
  requestedAccountType: 'SAVINGS',
  openingDeposit: 1000,
  termMonths: 12,
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const typedText = useTypingEffect(HERO_PHRASES);
  const [role, setRole] = useState('CUSTOMER');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState(defaultRegistration);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  // OTP state
  const [otpModal, setOtpModal] = useState(null); // null | { otp, userData, destination }
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');

  const loginHint = useMemo(
    () => role === 'ADMIN' ? 'UserID: demo_admin / Password: Admin@123' : 'UserID: demo_alice / Password: Demo@123',
    [role]
  );

  const validateRegistration = () => {
    const errors = {};
    if (!registerForm.customerName.trim() || registerForm.customerName.trim().length < 2)
      errors.customerName = 'Full name must be at least 2 characters.';
    if (!/^[6-9]\d{9}$/.test(registerForm.phoneNo))
      errors.phoneNo = 'Enter a valid 10-digit Indian mobile number starting with 6–9.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.emailId))
      errors.emailId = 'Enter a valid email address.';
    const age = Number(registerForm.age);
    if (!Number.isInteger(age) || age < 18 || age > 120)
      errors.age = 'Age must be between 18 and 120.';
    const govtId = registerForm.govtId.trim();
    if (registerForm.govtIdType === 'NATIONAL_ID') {
      if (!/^\d{4}\s?\d{4}\s?\d{4}$/.test(govtId))
        errors.govtId = 'Aadhaar must be 12 digits (e.g. 1234 5678 9012).';
    } else if (registerForm.govtIdType === 'TAX_ID') {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(govtId.toUpperCase()))
        errors.govtId = 'PAN must be in format ABCDE1234F (5 letters, 4 digits, 1 letter).';
    } else if (registerForm.govtIdType === 'PASSPORT') {
      if (!/^[A-Z]\d{7}$/.test(govtId.toUpperCase()))
        errors.govtId = 'Passport must be 1 letter followed by 7 digits (e.g. A1234567).';
    } else if (registerForm.govtIdType === 'DRIVING_LICENSE') {
      if (!/^[A-Z]{2}\d{2}\s?\d{11}$/.test(govtId.toUpperCase()))
        errors.govtId = 'Driving License format: state code + RTO + 11 digits (e.g. MH01 20230012345).';
    }
    if (!registerForm.addressLine.trim() || registerForm.addressLine.trim().length < 5)
      errors.addressLine = 'Please enter a valid address (at least 5 characters).';
    if (!registerForm.city.trim())
      errors.city = 'City is required.';
    if (!registerForm.state.trim())
      errors.state = 'State is required.';
    if (!/^\d{6}$/.test(registerForm.postalCode))
      errors.postalCode = 'Postal code must be exactly 6 digits.';
    if (Number(registerForm.openingDeposit) < 1000)
      errors.openingDeposit = 'Opening deposit must be at least ₹1,000.';
    if (registerForm.requestedAccountType === 'TERM' && Number(registerForm.termMonths) < 3)
      errors.termMonths = 'Term must be at least 3 months.';
    return errors;
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data } = await api.post('/auth/login', {
        username: credentials.username,
        password: credentials.password,
        role
      });
      // Generate 6-digit OTP (simulate SMS to registered mobile)
      const otp = String(Math.floor(Math.random() * 900000) + 100000);
      setOtpInput('');
      setOtpError('');
      setOtpModal({ otp, userData: data.data, destination: role === 'ADMIN' ? '/admin' : '/customer' });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = () => {
    if (!otpInput.trim()) return setOtpError('Please enter the OTP.');
    if (otpInput.trim() !== otpModal.otp) return setOtpError('Incorrect OTP. Please try again.');
    login(otpModal.userData);
    navigate(otpModal.destination);
    setOtpModal(null);
  };

  const handleRegistration = async (event) => {
    event.preventDefault();
    const errors = validateRegistration();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        ...registerForm,
        openingDeposit: Number(registerForm.openingDeposit),
        age: Number(registerForm.age),
        termMonths: registerForm.requestedAccountType === 'TERM' ? Number(registerForm.termMonths) : null
      };
      const { data } = await api.post('/auth/register/customer', payload);
      navigate('/kyc', { state: { profile: data.data } });
    } catch (requestError) {
      const validationErrors = requestError.response?.data?.validationErrors;
      if (validationErrors) {
        setError(Object.values(validationErrors).join(' • '));
      } else {
        setError(requestError.response?.data?.message || 'Unable to submit registration right now.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-layout">
      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}

      {/* OTP Verification Modal */}
      {otpModal && (
        <div className="modal-backdrop" onClick={() => {}}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔐</div>
              <h3 style={{ margin: 0 }}>OTP Verification</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>A 6-digit OTP has been sent to your registered mobile number.</p>
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#166534', marginBottom: '0.25rem', fontWeight: 600 }}>Your OTP (simulated — check here in demo)</div>
              <div style={{ fontFamily: 'monospace', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '0.25em', color: '#15803d' }}>{otpModal.otp}</div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>Valid for 5 minutes</div>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.75rem' }}>
              Enter OTP
              <input
                type="text" maxLength={6} placeholder="Enter 6-digit OTP"
                value={otpInput} onChange={e => { setOtpInput(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleOtpVerify()}
                style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: `1.5px solid ${otpError ? '#dc2626' : 'var(--line)'}`, fontSize: '1.1rem', fontFamily: 'monospace', textAlign: 'center', letterSpacing: '0.2em', background: 'var(--panel)', color: 'var(--text)' }}
                autoFocus
              />
              {otpError && <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>{otpError}</span>}
            </label>
            <div className="modal-actions">
              <button className="button button--secondary" onClick={() => setOtpModal(null)}>Cancel</button>
              <button className="button button--primary" onClick={handleOtpVerify}>Verify & Login</button>
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.75rem' }}>
              Didn't receive OTP? Check your registered mobile. OTP: <strong style={{ fontFamily: 'monospace' }}>{otpModal.otp}</strong>
            </p>
          </div>
        </div>
      )}

      <section className="login-hero">
        <div className="brand-mark brand-mark--light">
          <span className="brand-mark__icon">N</span>
          <div>
            <div className="brand-mark__title">Nova Bank</div>
            <div className="brand-mark__sub">Bank with confidence, online</div>
          </div>
        </div>

        <div className="hero-copy">
          <div className="page-eyebrow page-eyebrow--light">Digital banking workspace</div>
          <h1><span className="typing-text">{typedText}</span></h1>
          <p>
            View balances, transfer funds, manage beneficiaries, review approvals, and track activity
            from one clean web console.
          </p>
        </div>

        <div className="hero-grid">
          <div className="hero-card">
            <h3>Customer access</h3>
            <p>Account summary, quick transfer, deposits, withdrawals, nominees, and beneficiaries.</p>
          </div>
          <div className="hero-card">
            <h3>Admin oversight</h3>
            <p>Application approval, interest review, portfolio metrics, and transaction reporting.</p>
          </div>
          <div className="hero-card">
            <h3>Security cues</h3>
            <p>Role-based access, JWT-protected APIs, validation-first forms, and exception-safe flows.</p>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={role === 'CUSTOMER' ? 'auth-tab auth-tab--active' : 'auth-tab'}
              onClick={() => setRole('CUSTOMER')}
            >
              Customer login
            </button>
            <button
              type="button"
              className={role === 'ADMIN' ? 'auth-tab auth-tab--active' : 'auth-tab'}
              onClick={() => setRole('ADMIN')}
            >
              Admin login
            </button>
          </div>

          <div className="auth-header">
            <h2>{role === 'ADMIN' ? 'Administrator access' : 'Welcome back'}</h2>
            <p>Use your internet banking credentials to continue.</p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              <span>User ID</span>
              <input
                value={credentials.username}
                onChange={(event) => setCredentials((prev) => ({ ...prev, username: event.target.value }))}
                placeholder={role === 'ADMIN' ? 'Enter your user ID' : 'Enter your user ID'}
              />
            </label>
            <label>
              <span>Password</span>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Enter your password"
                  style={{ paddingRight: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{
                    position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary, #888)',
                    fontSize: '1.1rem', padding: 0, lineHeight: 1
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                </button>
              </div>
            </label>
            <div className="helper-text">{loginHint}</div>
            {role === 'CUSTOMER' && (
              <div style={{ textAlign: 'right', marginTop: '-0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--accent)', fontSize: '0.83rem', fontWeight: 500, padding: 0,
                    textDecoration: 'underline', textUnderlineOffset: '2px',
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}
            <button className="button button--primary" disabled={loading}>
              {loading ? 'Signing in...' : role === 'ADMIN' ? 'Sign in as admin' : 'Sign in as customer'}
            </button>
          </form>

          {error ? <div className="alert alert--error">{error}</div> : null}
          {message ? <div className="alert alert--success">{message}</div> : null}

          <div className="divider" />

          <div className="register-toggle">
            <div>
              <strong>New customer?</strong>
              <span>Start a savings or term account request.</span>
            </div>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => { setShowRegister((current) => !current); setFormErrors({}); }}
            >
              {showRegister ? 'Hide form' : 'Open account'}
            </button>
          </div>

          {showRegister ? (
            <form className="grid-form" onSubmit={handleRegistration}>
              <label>
                <span>Full name</span>
                <input className={formErrors.customerName ? 'input--error' : ''} value={registerForm.customerName} onChange={(e) => setRegisterForm((p) => ({ ...p, customerName: toTitleCase(e.target.value) }))} />
                {formErrors.customerName && <span className="field-error">{formErrors.customerName}</span>}
              </label>
              <label>
                <span>Phone</span>
                <input className={formErrors.phoneNo ? 'input--error' : ''} value={registerForm.phoneNo} maxLength={10} onChange={(e) => setRegisterForm((p) => ({ ...p, phoneNo: e.target.value.replace(/\D/g, '') }))} />
                {formErrors.phoneNo && <span className="field-error">{formErrors.phoneNo}</span>}
              </label>
              <label>
                <span>Email</span>
                <input className={formErrors.emailId ? 'input--error' : ''} value={registerForm.emailId} onChange={(e) => setRegisterForm((p) => ({ ...p, emailId: e.target.value }))} />
                {formErrors.emailId && <span className="field-error">{formErrors.emailId}</span>}
              </label>
              <label>
                <span>Age</span>
                <input type="text" inputMode="numeric" maxLength={3} className={formErrors.age ? 'input--error' : ''} value={registerForm.age} onChange={(e) => setRegisterForm((p) => ({ ...p, age: e.target.value.replace(/\D/g, '') }))} />
                {formErrors.age && <span className="field-error">{formErrors.age}</span>}
              </label>
              <label>
                <span>Gender</span>
                <select value={registerForm.gender} onChange={(e) => setRegisterForm((p) => ({ ...p, gender: e.target.value }))}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label>
                <span>Government ID type</span>
                <select value={registerForm.govtIdType} onChange={(e) => setRegisterForm((p) => ({ ...p, govtIdType: e.target.value }))}>
                  <option value="NATIONAL_ID">Aadhaar Card</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                  <option value="TAX_ID">PAN Card</option>
                </select>
              </label>
              <label className="grid-form__wide">
                <span>Government ID number</span>
                <input
                  className={formErrors.govtId ? 'input--error' : ''}
                  type="text"
                  inputMode={registerForm.govtIdType === 'NATIONAL_ID' ? 'numeric' : 'text'}
                  maxLength={
                    registerForm.govtIdType === 'NATIONAL_ID' ? 12 :
                    registerForm.govtIdType === 'TAX_ID' ? 10 :
                    registerForm.govtIdType === 'PASSPORT' ? 8 :
                    registerForm.govtIdType === 'DRIVING_LICENSE' ? 16 :
                    20
                  }
                  value={registerForm.govtId}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (registerForm.govtIdType === 'NATIONAL_ID') val = val.replace(/\D/g, '');
                    if (registerForm.govtIdType === 'TAX_ID') val = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    if (registerForm.govtIdType === 'PASSPORT') val = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    if (registerForm.govtIdType === 'DRIVING_LICENSE') val = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setRegisterForm((p) => ({ ...p, govtId: val }));
                  }}
                  placeholder={
                    registerForm.govtIdType === 'NATIONAL_ID' ? 'e.g. 1234 5678 9012 (Aadhaar)' :
                    registerForm.govtIdType === 'TAX_ID' ? 'e.g. ABCDE1234F (PAN)' :
                    registerForm.govtIdType === 'PASSPORT' ? 'e.g. A1234567' :
                    registerForm.govtIdType === 'DRIVING_LICENSE' ? 'e.g. MH01 20230012345' :
                    'Enter your ID number'
                  }
                />
                {formErrors.govtId && <span className="field-error">{formErrors.govtId}</span>}
              </label>
              <label className="grid-form__wide">
                <span>Address</span>
                <input className={formErrors.addressLine ? 'input--error' : ''} value={registerForm.addressLine} onChange={(e) => setRegisterForm((p) => ({ ...p, addressLine: e.target.value }))} />
                {formErrors.addressLine && <span className="field-error">{formErrors.addressLine}</span>}
              </label>
              <label>
                <span>City</span>
                <input className={formErrors.city ? 'input--error' : ''} value={registerForm.city} onChange={(e) => setRegisterForm((p) => ({ ...p, city: toTitleCase(e.target.value) }))} />
                {formErrors.city && <span className="field-error">{formErrors.city}</span>}
              </label>
              <label>
                <span>State</span>
                <input className={formErrors.state ? 'input--error' : ''} value={registerForm.state} onChange={(e) => setRegisterForm((p) => ({ ...p, state: toTitleCase(e.target.value) }))} />
                {formErrors.state && <span className="field-error">{formErrors.state}</span>}
              </label>
              <label>
                <span>Postal code</span>
                <input className={formErrors.postalCode ? 'input--error' : ''} maxLength={6} value={registerForm.postalCode} onChange={(e) => setRegisterForm((p) => ({ ...p, postalCode: e.target.value.replace(/\D/g, '') }))} />
                {formErrors.postalCode && <span className="field-error">{formErrors.postalCode}</span>}
              </label>
              <label>
                <span>Account type</span>
                <select
                  value={registerForm.requestedAccountType}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, requestedAccountType: e.target.value }))}
                >
                  <option value="SAVINGS">Savings</option>
                  <option value="TERM">Term (Fixed)</option>
                </select>
              </label>
              <label>
                <span>Opening deposit (min ₹1,000)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  className={formErrors.openingDeposit ? 'input--error' : ''}
                  value={registerForm.openingDeposit}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, openingDeposit: e.target.value.replace(/\D/g, '') }))}
                />
                {formErrors.openingDeposit && <span className="field-error">{formErrors.openingDeposit}</span>}
              </label>
              {registerForm.requestedAccountType === 'TERM' ? (
                <label>
                  <span>Term months (min 3)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    className={formErrors.termMonths ? 'input--error' : ''}
                    value={registerForm.termMonths}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, termMonths: e.target.value.replace(/\D/g, '') }))}
                  />
                  {formErrors.termMonths && <span className="field-error">{formErrors.termMonths}</span>}
                </label>
              ) : null}
              <button className="button button--primary" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit application'}
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
}
