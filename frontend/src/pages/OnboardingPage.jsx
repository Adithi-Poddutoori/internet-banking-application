import { useLocation, useNavigate } from 'react-router-dom';

export default function OnboardingPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const profile = state?.profile;

  if (!profile) {
    return (
      <div className="onboarding-page">
        <div className="onboarding-card">
          <div className="onboarding-card__icon">⚠️</div>
          <h2>No credentials found</h2>
          <p className="onboarding-card__sub">Please register first to receive your onboarding credentials.</p>
          <button className="button button--primary" onClick={() => navigate('/login')}>Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="onboarding-card__icon">🎉</div>
        <h2>Application Submitted!</h2>
        <p className="onboarding-card__sub">Your account application has been created. Save these credentials securely.</p>

        <div className="credential-grid">
          <div>
            <span>Customer Name</span>
            <strong>{profile.customerName}</strong>
          </div>
          <div>
            <span>Account Number</span>
            <strong>{profile.generatedAccountNumber}</strong>
          </div>
          <div>
            <span>User ID</span>
            <strong>{profile.generatedUserId}</strong>
          </div>
          <div>
            <span>Temporary Password</span>
            <strong>{profile.generatedPassword}</strong>
          </div>
        </div>

        <div className="onboarding-card__warning">
          ⚠️ Save these credentials now — they will not be shown again. Your profile remains inactive until an administrator approves the request.
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button className="button button--primary" onClick={() => navigate('/login')}>Go to Login</button>
          <button className="button button--secondary" onClick={() => navigate('/')}>Back to Home</button>
        </div>
      </div>
    </div>
  );
}
