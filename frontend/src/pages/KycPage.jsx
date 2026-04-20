import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function KycPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const fileRef = useRef();
  const [photo, setPhoto] = useState(null);
  const [step, setStep] = useState(1); // 1=upload, 2=verifying, 3=done
  const profile = state?.profile;

  if (!profile) {
    return (
      <div className="kyc-page">
        <div className="kyc-card">
          <div className="kyc-card__icon">⚠️</div>
          <h2>Session expired</h2>
          <p className="kyc-card__sub">Please register again to continue with KYC verification.</p>
          <button className="button button--primary" onClick={() => navigate('/login')}>Go to Login</button>
        </div>
      </div>
    );
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhoto(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleVerify = () => {
    setStep(2);
    // Simulate verification delay
    setTimeout(() => setStep(3), 2500);
  };

  const handleContinue = () => {
    navigate('/onboarding', { state: { profile } });
  };

  return (
    <div className="kyc-page">
      <div className="kyc-card">
        {/* Progress indicator */}
        <div className="kyc-progress">
          <div className={`kyc-progress__step${step >= 1 ? ' kyc-progress__step--active' : ''}`}>
            <span className="kyc-progress__dot">1</span>
            <span>Upload Photo</span>
          </div>
          <div className="kyc-progress__line" />
          <div className={`kyc-progress__step${step >= 2 ? ' kyc-progress__step--active' : ''}`}>
            <span className="kyc-progress__dot">2</span>
            <span>Verification</span>
          </div>
          <div className="kyc-progress__line" />
          <div className={`kyc-progress__step${step >= 3 ? ' kyc-progress__step--active' : ''}`}>
            <span className="kyc-progress__dot">3</span>
            <span>Complete</span>
          </div>
        </div>

        {step === 1 && (
          <>
            <div className="kyc-card__icon">📸</div>
            <h2>KYC Verification</h2>
            <p className="kyc-card__sub">Upload a clear photo of yourself for identity verification. This helps us secure your account.</p>

            <div
              className={`kyc-upload-area${photo ? ' kyc-upload-area--has-photo' : ''}`}
              onClick={() => fileRef.current?.click()}
            >
              {photo ? (
                <img src={photo} alt="Your photo" className="kyc-upload-area__preview" />
              ) : (
                <>
                  <div className="kyc-upload-area__icon">📷</div>
                  <p>Click to upload your photo</p>
                  <span className="kyc-upload-area__hint">JPG, PNG — max 5 MB</span>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {photo && (
              <div className="kyc-actions">
                <button className="button button--secondary" onClick={() => setPhoto(null)}>Re-upload</button>
                <button className="button button--primary" onClick={handleVerify}>Verify Identity</button>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <div className="kyc-verifying">
            <div className="kyc-spinner" />
            <h2>Verifying your identity...</h2>
            <p className="kyc-card__sub">Please wait while we verify your photo against your government ID records.</p>
          </div>
        )}

        {step === 3 && (
          <>
            <div className="kyc-card__icon kyc-card__icon--success">✅</div>
            <h2>KYC Verified!</h2>
            <p className="kyc-card__sub">Your identity has been successfully verified. You can now proceed to view your account credentials.</p>
            <div className="kyc-verified-details">
              <div><span>Name</span><strong>{profile.customerName}</strong></div>
              <div><span>Status</span><strong className="text-success">Verified</strong></div>
            </div>
            <button className="button button--primary" onClick={handleContinue}>Continue to Credentials</button>
          </>
        )}
      </div>
    </div>
  );
}
