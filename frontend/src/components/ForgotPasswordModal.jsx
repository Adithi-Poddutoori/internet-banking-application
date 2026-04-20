import { useState } from 'react';
import api from '../services/api';

/**
 * ForgotPasswordModal – a 3-step inline modal:
 *   Step 1: Enter email → check if customer account exists → send OTP
 *   Step 2: Enter OTP → verify
 *   Step 3: Enter new password → reset → success
 *
 * Props:
 *   onClose: () => void
 */
export default function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState(1); // 1 | 2 | 3
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const id = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setError('Please enter your email address.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError('Please enter a valid email address.');

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setStep(2);
      startResendCooldown();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setOtp('');
      startResendCooldown();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6)
      return setError('Please enter the 6-digit OTP sent to your email.');
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-otp', { email: email.trim(), otp: otp.trim(), newPassword: '' });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please check and try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Reset password ────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6)
      return setError('Password must be at least 6 characters.');
    if (newPassword !== confirmPassword)
      return setError('Passwords do not match.');

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      setStep(4); // success screen
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The OTP may have expired.');
      // If OTP was wrong or expired on this step, go back to OTP entry
      if (err.response?.status === 400) {
        setStep(2);
        setOtp('');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasError) => ({
    padding: '0.65rem 0.85rem',
    borderRadius: '8px',
    border: `1.5px solid ${hasError ? '#dc2626' : 'var(--line)'}`,
    fontSize: '0.95rem',
    background: 'var(--panel)',
    color: 'var(--text)',
    width: '100%',
    boxSizing: 'border-box',
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '440px', width: '100%' }}
      >
        {/* ── Step 1: Enter email ── */}
        {step === 1 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>🔑</div>
              <h3 style={{ margin: 0 }}>Forgot Password?</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                Enter your registered email address. We will send you a one-time password (OTP).
              </p>
            </div>

            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 500 }}>
                Email address
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  style={inputStyle(!!error)}
                  autoFocus
                />
                {error && <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>{error}</span>}
              </label>

              <div className="modal-actions">
                <button type="button" className="button button--secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="button button--primary" disabled={loading}>
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── Step 2: Enter OTP ── */}
        {step === 2 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>📧</div>
              <h3 style={{ margin: 0 }}>Check your inbox</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                A 6-digit OTP has been sent to <strong>{email}</strong>.<br />
                It is valid for <strong>10 minutes</strong>.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 500 }}>
                One-Time Password (OTP)
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                  style={{
                    ...inputStyle(!!error),
                    fontFamily: 'monospace',
                    fontSize: '1.4rem',
                    letterSpacing: '0.35em',
                    textAlign: 'center',
                  }}
                  autoFocus
                />
                {error && <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>{error}</span>}
              </label>

              <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--muted)' }}>
                Didn't receive it?{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  style={{
                    background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'default' : 'pointer',
                    color: resendCooldown > 0 ? 'var(--muted)' : 'var(--accent)',
                    fontWeight: 600, fontSize: '0.82rem', padding: 0,
                  }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>

              <div className="modal-actions">
                <button type="button" className="button button--secondary" onClick={() => { setStep(1); setError(''); setOtp(''); }}>
                  Back
                </button>
                <button type="submit" className="button button--primary" disabled={loading}>
                  Verify OTP
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── Step 3: Set new password ── */}
        {step === 3 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>🔒</div>
              <h3 style={{ margin: 0 }}>Set new password</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                Choose a strong password for your Nova Bank account.
              </p>
            </div>

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 500 }}>
                New password
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setError(''); }}
                    style={{ ...inputStyle(!!error && !confirmPassword), paddingRight: '2.5rem' }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    style={{
                      position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary, #888)',
                      fontSize: '1.1rem', padding: 0,
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 500 }}>
                Confirm new password
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat your new password"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                  style={inputStyle(!!error)}
                />
                {error && <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>{error}</span>}
              </label>

              {/* Password strength hint */}
              {newPassword.length > 0 && (
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Strength:{' '}
                  <span style={{ color: newPassword.length < 6 ? '#dc2626' : newPassword.length < 10 ? '#d97706' : '#16a34a', fontWeight: 600 }}>
                    {newPassword.length < 6 ? 'Too short' : newPassword.length < 10 ? 'Fair' : 'Strong'}
                  </span>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="button button--secondary" onClick={() => { setStep(2); setError(''); setNewPassword(''); setConfirmPassword(''); }}>
                  Back
                </button>
                <button type="submit" className="button button--primary" disabled={loading}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
            <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>Password reset!</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Your password has been updated successfully.<br />
              You can now log in with your new password.
            </p>
            <button className="button button--primary" onClick={onClose} style={{ width: '100%' }}>
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
