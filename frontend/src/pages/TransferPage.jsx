import { useEffect, useMemo, useState } from 'react';
import { useAutoRefresh } from '../utils/useAutoRefresh';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, maskAccount } from '../utils/formatters';
import { getPrimaryAccount } from '../utils/primaryAccount';
import { logActivity } from '../utils/activityLog';
const TRANSFER_MODES = [
  { value: 'NEFT', label: 'NEFT', desc: 'National Electronic Funds Transfer', charges: '₹2.50 – ₹25' },
  { value: 'IMPS', label: 'IMPS', desc: 'Immediate Payment Service (24×7)', charges: '₹1 – ₹15' },
  { value: 'RTGS', label: 'RTGS', desc: 'Real Time Gross Settlement (Min ₹2L)', charges: '₹20 – ₹45' }
];

function getEstimatedCharge(mode, amount) {
  const amt = Number(amount) || 0;
  if (!mode || mode === 'SAME_BANK') return 0;
  if (mode === 'NEFT') {
    if (amt <= 10000) return 2.5;
    if (amt <= 100000) return 5;
    if (amt <= 200000) return 15;
    return 25;
  }
  if (mode === 'IMPS') {
    if (amt <= 1000) return 1;
    if (amt <= 10000) return 5;
    if (amt <= 100000) return 10;
    return 15;
  }
  if (mode === 'RTGS') {
    if (amt <= 500000) return 20;
    return 45;
  }
  return 0;
}

export default function TransferPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [transferType, setTransferType] = useState('same'); // 'same' | 'other' | 'upi'
  const [form, setForm] = useState({ fromAccount: '', toAccount: '', amount: '', remarks: '', transferMode: 'NEFT' });
  const [upiForm, setUpiForm] = useState({ upiId: '', amount: '', remarks: '' });
  const [upiLaunched, setUpiLaunched] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  // OTP state
  const [otpModal, setOtpModal] = useState(null); // null | { otp, pendingFn }
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/customers/dashboard');
      const payload = data.data;
      setAccounts(payload.accounts || []);
      setBeneficiaries([...(payload.beneficiaries || [])]);
      const primary = getPrimaryAccount(user?.username);
      const defaultAcc = primary
        || (payload.accounts || []).find(a => a.accountType === 'SAVINGS' && a.status === 'ACTIVE')?.accountNumber;
      if (defaultAcc) setForm(p => ({ ...p, fromAccount: p.fromAccount || defaultAcc }));
    } catch (e) {
      if (e.response?.status !== 403) setToast({ message: 'Unable to load data', type: 'error' });
    }
  };

  useEffect(() => { load(); }, []);
  useAutoRefresh(load, 30000);

  const activeSavings = useMemo(() => accounts.filter(a => a.accountType === 'SAVINGS' && a.status === 'ACTIVE'), [accounts]);
  const otherAccounts = useMemo(() => activeSavings.filter(a => a.accountNumber !== form.fromAccount), [activeSavings, form.fromAccount]);

  const estimatedCharge = transferType === 'same' ? 0 : getEstimatedCharge(form.transferMode, form.amount);

  const launchUpi = () => {
    if (!upiForm.upiId.trim()) return setErrorModal('Please enter a UPI ID (e.g. 9876543210@upi).');
    if (!upiForm.amount || Number(upiForm.amount) <= 0) return setErrorModal('Please enter a valid amount.');
    // Basic UPI ID format check
    if (!/^[a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+$/.test(upiForm.upiId.trim())) {
      return setErrorModal('Invalid UPI ID format. Example: 9876543210@upi or name@bankname');
    }
    const params = new URLSearchParams({
      pa: upiForm.upiId.trim(),
      pn: 'Nova Bank',
      am: Number(upiForm.amount).toFixed(2),
      cu: 'INR',
      ...(upiForm.remarks ? { tn: upiForm.remarks.trim() } : {}),
    });
    const deepLink = `upi://pay?${params.toString()}`;
    window.location.href = deepLink;
    setUpiLaunched(true);
    // After 3s, if still on page, assume desktop (no UPI app) and show info
    setTimeout(() => setUpiLaunched(false), 3000);
  };

  const submitTransfer = async () => {
    if (!form.fromAccount) return setErrorModal('Please enter a source account.');
    if (!form.toAccount) return setErrorModal('Please enter or select a destination account number.');
    if (!form.amount || Number(form.amount) <= 0) return setErrorModal('Please enter a valid transfer amount.');

    // For same-bank transfers, verify the destination account exists and is active
    if (transferType === 'same') {
      try {
        await api.get(`/accounts/lookup/${form.toAccount}`);
      } catch {
        return setErrorModal(`Account ${form.toAccount} was not found in Nova Bank or is not active. Please check the account number and try again.`);
      }
    }

    // Generate OTP and show verify modal before proceeding
    const otp = String(Math.floor(Math.random() * 900000) + 100000);
    setOtpInput('');
    setOtpError('');
    setOtpModal({ otp, pendingFn: () => executeTransfer() });
  };

  const executeTransfer = async () => {
    setOtpModal(null);
    setLoading(true);
    try {
      const mode = transferType === 'same' ? null : form.transferMode;
      await api.post('/accounts/transfer', {
        fromAccountNumber: form.fromAccount,
        toAccountNumber: form.toAccount,
        amount: Number(form.amount),
        remarks: form.remarks || (mode ? `${mode} transfer` : 'Same-bank transfer'),
        transferMode: mode
      });
      const label = mode || 'Same-bank';
      const now = new Date().toISOString();
      // The backend already committed TRANSFER_OUT immediately; load() below fetches it.
      // No local transaction needed — adding one causes duplicates since IDs never match.
      logActivity(user?.username, 'TRANSFER', { from: form.fromAccount, to: form.toAccount, amount: Number(form.amount), mode: label, remarks: form.remarks });
      setToast({ message: `${label} transfer of ${formatCurrency(form.amount)} completed!`, type: 'success' });
      setForm(p => ({ ...p, toAccount: '', amount: '', remarks: '' }));
      load();
    } catch (e) {
      setErrorModal(e.response?.data?.message || 'Transfer failed. Please check the account number and balance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell role="CUSTOMER" title="Fund Transfer" subtitle="Transfer money within Nova Bank or to other banks.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* OTP Modal */}
      {otpModal && (
        <div className="modal-backdrop" onClick={() => {}}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '0.4rem' }}>🔐</div>
              <h3 style={{ margin: 0 }}>Confirm Transfer</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>Enter the OTP sent to your registered mobile number to authorize this transaction.</p>
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '0.65rem 1rem', marginBottom: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600, marginBottom: '0.2rem' }}>Your OTP (demo — shown here for testing)</div>
              <div style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '0.2em', color: '#15803d' }}>{otpModal.otp}</div>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.75rem' }}>
              Enter OTP
              <input type="text" maxLength={6} placeholder="6-digit OTP"
                value={otpInput} onChange={e => { setOtpInput(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
                onKeyDown={e => e.key === 'Enter' && (otpInput === otpModal.otp ? otpModal.pendingFn() : setOtpError('Incorrect OTP.'))}
                style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: `1.5px solid ${otpError ? '#dc2626' : 'var(--line)'}`, fontSize: '1.1rem', fontFamily: 'monospace', textAlign: 'center', letterSpacing: '0.2em', background: 'var(--panel)', color: 'var(--text)' }}
                autoFocus />
              {otpError && <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>{otpError}</span>}
            </label>
            <div className="modal-actions">
              <button className="button button--secondary" onClick={() => setOtpModal(null)}>Cancel</button>
              <button className="button button--primary" onClick={() => {
                if (!otpInput.trim()) return setOtpError('Please enter the OTP.');
                if (otpInput.trim() !== otpModal.otp) return setOtpError('Incorrect OTP. Please try again.');
                otpModal.pendingFn();
              }}>Verify & Transfer</button>
            </div>
          </div>
        </div>
      )}

      {errorModal && (
        <div className="modal-backdrop" onClick={() => setErrorModal('')}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="error-modal-icon">⚠️</div>
            <h3>Transfer Failed</h3>
            <p className="error-modal-msg">{errorModal}</p>
            <div className="modal-actions">
              <button className="button button--primary" onClick={() => setErrorModal('')}>OK</button>
            </div>
          </div>
        </div>
      )}

      <SectionCard title="Transfer type" subtitle="Choose how you want to send money.">
        <div className="transfer-modes">
          <button
            type="button"
            className={`transfer-mode-card${transferType === 'same' ? ' transfer-mode-card--active' : ''}`}
            onClick={() => setTransferType('same')}
          >
            <div className="transfer-mode-card__icon">🏦</div>
            <div className="transfer-mode-card__name">Same Bank</div>
            <div className="transfer-mode-card__desc">Transfer within Nova Bank — Free</div>
          </button>
          <button
            type="button"
            className={`transfer-mode-card${transferType === 'other' ? ' transfer-mode-card--active' : ''}`}
            onClick={() => setTransferType('other')}
          >
            <div className="transfer-mode-card__icon">🌐</div>
            <div className="transfer-mode-card__name">Other Bank</div>
            <div className="transfer-mode-card__desc">NEFT / IMPS / RTGS</div>
          </button>
          <button
            type="button"
            className={`transfer-mode-card${transferType === 'upi' ? ' transfer-mode-card--active' : ''}`}
            onClick={() => setTransferType('upi')}
          >
            <div className="transfer-mode-card__icon">📱</div>
            <div className="transfer-mode-card__name">UPI</div>
            <div className="transfer-mode-card__desc">Pay to any UPI ID — Free</div>
          </button>
        </div>
      </SectionCard>

      {transferType === 'other' && (
        <SectionCard title="Transfer mode" subtitle="Choose NEFT, IMPS, or RTGS.">
          <div className="transfer-modes">
            {TRANSFER_MODES.map(mode => (
              <button
                key={mode.value}
                type="button"
                className={`transfer-mode-card${form.transferMode === mode.value ? ' transfer-mode-card--active' : ''}`}
                onClick={() => setForm(p => ({ ...p, transferMode: mode.value }))}
              >
                <div className="transfer-mode-card__name">{mode.label}</div>
                <div className="transfer-mode-card__desc">{mode.desc}</div>
                <div className="transfer-mode-card__charge">Charges: {mode.charges}</div>
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {transferType === 'upi' && (() => {
        const primary = getPrimaryAccount(user?.username);
        const primaryAcc = accounts.find(a => a.accountNumber === primary);
        return (
        <div className="content-grid content-grid--wide">
          <SectionCard title="UPI Payment" subtitle="Pay instantly to any UPI ID. Opens your UPI app on mobile.">
            <div className="stack-form">
              {/* Primary account source */}
              {primaryAcc ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', borderRadius: '10px',
                  background: 'var(--primary-soft)', border: '1px solid var(--primary)',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>🏦</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Debiting from primary account</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                      {primaryAcc.accountNumber} · {formatCurrency(primaryAcc.balance)} available
                    </div>
                  </div>
                  <a href="/customer/profile" style={{ fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'underline', whiteSpace: 'nowrap' }}>Change</a>
                </div>
              ) : (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: '#fef9c3', border: '1px solid #fde047', fontSize: '0.875rem', color: '#713f12' }}>
                  ⚠️ No primary account set. <a href="/customer/profile" style={{ color: '#713f12', fontWeight: 600 }}>Set one in your profile</a> for smoother UPI payments.
                </div>
              )}
              <label>
                <span>UPI ID <span style={{ color: 'var(--danger)' }}>*</span></span>
                <input
                  type="text"
                  placeholder="e.g. 9876543210@upi or name@okicici"
                  value={upiForm.upiId}
                  onChange={e => setUpiForm(f => ({ ...f, upiId: e.target.value }))}
                />
              </label>
              <label>
                <span>Amount (₹) <span style={{ color: 'var(--danger)' }}>*</span></span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Enter amount"
                  value={upiForm.amount}
                  onChange={e => setUpiForm(f => ({ ...f, amount: e.target.value.replace(/\D/g, '') }))}
                />
              </label>
              <label>
                <span>Description (optional)</span>
                <input
                  type="text"
                  placeholder="Payment note"
                  value={upiForm.remarks}
                  onChange={e => setUpiForm(f => ({ ...f, remarks: e.target.value }))}
                />
              </label>
              {upiLaunched && (
                <div style={{
                  padding: '0.85rem 1rem', borderRadius: '10px',
                  background: '#fef9c3', border: '1px solid #fde047',
                  fontSize: '0.875rem', color: '#713f12', lineHeight: 1.5,
                }}>
                  📱 Opening your UPI app… If nothing opened, you may be on a desktop browser where UPI deep-links only work on a mobile device with a UPI app (GPay, PhonePe, Paytm) installed.
                </div>
              )}
              <button className="button button--primary" onClick={launchUpi}>
                📱 Pay via UPI
              </button>
            </div>
          </SectionCard>

          <SectionCard title="How UPI works" subtitle="Quick guide to UPI payments.">
            <div className="list-block">
              <div className="list-item"><div><strong>What is a UPI ID?</strong><span>A virtual payment address like <code>9876543210@upi</code>, <code>name@okaxis</code>, or <code>name@ybl</code>. Find it in GPay, PhonePe or your bank's app.</span></div></div>
              <div className="list-item"><div><strong>Charges</strong><span>UPI transfers are completely free for amounts up to ₹1 lakh per transaction.</span></div></div>
              <div className="list-item"><div><strong>Daily limit</strong><span>₹1 lakh per day as per NPCI guidelines for most banks.</span></div></div>
              <div className="list-item"><div><strong>Mobile only</strong><span>The UPI deep-link opens your installed UPI app (GPay, PhonePe, Paytm, etc.). This works on mobile devices only.</span></div></div>
              <div className="list-item"><div><strong>Supported handles</strong><span>@upi, @oksbi, @okicici, @okaxis, @ybl, @paytm, @ibl, and all NPCI-registered handles.</span></div></div>
            </div>
          </SectionCard>
        </div>
        );
      })()}

      {transferType !== 'upi' && (
        <div className="content-grid content-grid--wide">
        <SectionCard title={transferType === 'same' ? 'Same Bank Transfer' : `${form.transferMode} Transfer`} subtitle={transferType === 'same' ? 'Transfer between your Nova Bank accounts — no charges.' : `Transfer via ${form.transferMode} to another bank.`}>
          <div className="stack-form">
            {/* From account — show primary prominently, allow switching */}
            {(() => {
              const primaryNum = getPrimaryAccount(user?.username);
              const selectedAcc = activeSavings.find(a => a.accountNumber === form.fromAccount);
              const isPrimary = form.fromAccount === primaryNum;
              return activeSavings.length <= 1 ? (
                <label>
                  <span>From account</span>
                  <select value={form.fromAccount} onChange={e => setForm(p => ({ ...p, fromAccount: e.target.value }))}>
                    <option value="">Choose source account</option>
                    {activeSavings.map(a => (
                      <option key={a.accountNumber} value={a.accountNumber}>
                        {maskAccount(a.accountNumber)} — {formatCurrency(a.balance)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>From account</span>
                  {/* Primary account highlight */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--primary-soft)', border: '1.5px solid var(--primary)' }}>
                    <span style={{ fontSize: '1.2rem' }}>🏦</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                        {selectedAcc ? maskAccount(selectedAcc.accountNumber) : '—'}
                        {isPrimary && <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', fontWeight: 700, background: 'var(--primary)', color: '#fff', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>PRIMARY</span>}
                      </div>
                      {selectedAcc && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                          {selectedAcc.accountType} · {formatCurrency(selectedAcc.balance)} available
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Switch account dropdown */}
                  <select
                    value={form.fromAccount}
                    onChange={e => setForm(p => ({ ...p, fromAccount: e.target.value }))}
                    style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.875rem', background: 'var(--panel)', color: 'var(--text)' }}
                  >
                    <option value="" disabled>Switch account…</option>
                    {activeSavings.map(a => {
                      const prim = a.accountNumber === primaryNum;
                      return (
                        <option key={a.accountNumber} value={a.accountNumber}>
                          {prim ? '★ Primary — ' : ''}{maskAccount(a.accountNumber)} ({a.accountType}) — {formatCurrency(a.balance)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              );
            })()}

            {transferType === 'same' ? (
              <>
                {otherAccounts.length > 0 && (
                  <label>
                    <span>To account (your accounts)</span>
                    <select value={form.toAccount} onChange={e => setForm(p => ({ ...p, toAccount: e.target.value }))}>
                      <option value="">Choose from your accounts</option>
                      {otherAccounts.map(a => (
                        <option key={a.accountNumber} value={a.accountNumber}>{maskAccount(a.accountNumber)} — {formatCurrency(a.balance)}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  <span>{otherAccounts.length > 0 ? 'Or enter Nova Bank account number' : 'Destination Nova Bank account number'}</span>
                  <input placeholder="Enter Nova Bank account number" value={form.toAccount} onChange={e => setForm(p => ({ ...p, toAccount: e.target.value }))} />
                </label>
              </>
            ) : (
              <>
                <label>
                  <span>To beneficiary</span>
                  <select value={form.toAccount} onChange={e => setForm(p => ({ ...p, toAccount: e.target.value }))}>
                    <option value="">Choose beneficiary or enter manually</option>
                    {beneficiaries.map(b => (
                      <option key={b.id} value={b.beneficiaryAccountNo}>{b.beneficiaryName} ({maskAccount(b.beneficiaryAccountNo)})</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Or enter account number</span>
                  <input placeholder="Destination account number" value={form.toAccount} onChange={e => setForm(p => ({ ...p, toAccount: e.target.value }))} />
                </label>
              </>
            )}

            <label>
              <span>Amount (₹)</span>
              <input type="text" inputMode="numeric" maxLength={10} placeholder="Enter amount" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value.replace(/\D/g, '') }))} />
            </label>
            <label>
              <span>Remarks</span>
              <input placeholder="Optional remarks" value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} />
            </label>

            {estimatedCharge > 0 && (
              <div className="transfer-charge-info">
                <span>Estimated charges:</span> <strong>₹{estimatedCharge.toFixed(2)}</strong>
                <span className="transfer-charge-info__total">Total debit: <strong>{formatCurrency(Number(form.amount || 0) + estimatedCharge)}</strong></span>
              </div>
            )}

            <button className="button button--primary" onClick={submitTransfer} disabled={loading}>
              {loading ? 'Processing...' : transferType === 'same' ? 'Transfer now (Free)' : `Transfer via ${form.transferMode}`}
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Transfer charges" subtitle="Applicable fees for different modes.">
          <div className="list-block">
            <div className="list-item"><div><strong>Same Bank</strong><span>Free — no charges for intra-bank transfers.</span></div></div>
            <div className="list-item"><div><strong>NEFT</strong><span>₹2.50 (≤₹10K) • ₹5 (≤₹1L) • ₹15 (≤₹2L) • ₹25 (above ₹2L). Batch settlements, Mon-Sat.</span></div></div>
            <div className="list-item"><div><strong>IMPS</strong><span>₹1 (≤₹1K) • ₹5 (≤₹10K) • ₹10 (≤₹1L) • ₹15 (above ₹1L). Instant 24×7. Max ₹5L.</span></div></div>
            <div className="list-item"><div><strong>RTGS</strong><span>₹20 (≤₹5L) • ₹45 (above ₹5L). Real-time, min ₹2L. Mon-Sat banking hours.</span></div></div>
            <div className="list-item"><div><strong>UPI</strong><span>Free for all amounts up to ₹1L. Instant 24×7. Requires mobile device with UPI app.</span></div></div>
          </div>
        </SectionCard>
        </div>
      )}
    </AppShell>
  );
}
