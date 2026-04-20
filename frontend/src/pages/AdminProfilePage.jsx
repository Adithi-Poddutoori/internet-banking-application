import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import api from '../services/api';

export default function AdminProfilePage() {
  const [profile, setProfile] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });

  useEffect(() => {
    api.get('/admin/me')
      .then(({ data }) => setProfile(data.data))
      .catch(e => setToast({ message: e.response?.data?.message || 'Unable to load profile.', type: 'error' }));
  }, []);

  return (
    <AppShell role="ADMIN" title="My Profile" subtitle="Your administrator account details.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {profile && (
        <SectionCard title="Administrator information" subtitle="Details registered with Nova Bank administration.">
          <div className="profile-grid">
            <div className="profile-field">
              <div className="profile-field__label">Full Name</div>
              <div className="profile-field__value">{profile.adminName}</div>
            </div>
            <div className="profile-field">
              <div className="profile-field__label">Username</div>
              <div className="profile-field__value">{profile.username}</div>
            </div>
            <div className="profile-field">
              <div className="profile-field__label">Email</div>
              <div className="profile-field__value">{profile.adminEmailId}</div>
            </div>
            <div className="profile-field">
              <div className="profile-field__label">Contact</div>
              <div className="profile-field__value">{profile.adminContact}</div>
            </div>
            <div className="profile-field">
              <div className="profile-field__label">Role</div>
              <div className="profile-field__value">{profile.role}</div>
            </div>
            <div className="profile-field">
              <div className="profile-field__label">Admin ID</div>
              <div className="profile-field__value">#{profile.id}</div>
            </div>
          </div>
        </SectionCard>
      )}
    </AppShell>
  );
}
