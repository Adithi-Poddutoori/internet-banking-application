import { useEffect, useState } from 'react';
import { useAutoRefresh } from '../utils/useAutoRefresh';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import api from '../services/api';
import { maskAccount } from '../utils/formatters';

export default function BeneficiariesPage() {
  const [dashboard, setDashboard] = useState(null);
  const [beneficiaryForm, setBeneficiaryForm] = useState({ beneficiaryName: '', beneficiaryAccountNo: '', ifsc: '', bankName: '', accountType: 'SAVINGS' });
  const [toast, setToast] = useState({ message: '', type: '' });
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ beneficiaryName: '', beneficiaryAccountNo: '', ifsc: '', bankName: '', accountType: 'SAVINGS' });
  const [deleteItem, setDeleteItem] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/customers/dashboard');
      setDashboard(data.data);
    } catch (e) {
      if (e.response?.status !== 403) setToast({ message: 'Unable to load data', type: 'error' });
    }
  };

  useEffect(() => { load(); }, []);
  useAutoRefresh(load, 30000);

  const activeSavings = (dashboard?.accounts || []).filter(a => a.accountType === 'SAVINGS' && a.status === 'ACTIVE');

  const addBeneficiary = async (e) => {
    e.preventDefault();
    const account = activeSavings[0];
    if (!account) return setToast({ message: 'Add a savings account first.', type: 'error' });
    try {
      await api.post(`/beneficiaries?accountNumber=${account.accountNumber}`, beneficiaryForm);
      setToast({ message: 'Beneficiary added successfully.', type: 'success' });
      setBeneficiaryForm({ beneficiaryName: '', beneficiaryAccountNo: '', ifsc: '', bankName: '', accountType: 'SAVINGS' });
      load();
    } catch (e2) {
      setToast({ message: e2.response?.data?.message || 'Unable to add beneficiary.', type: 'error' });
    }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({ beneficiaryName: item.beneficiaryName, beneficiaryAccountNo: item.beneficiaryAccountNo, ifsc: item.ifsc || '', bankName: item.bankName || '', accountType: item.accountType || 'SAVINGS' });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/beneficiaries/${editItem.id}`, editForm);
      setToast({ message: 'Beneficiary updated successfully.', type: 'success' });
      setEditItem(null);
      load();
    } catch (e2) {
      setToast({ message: e2.response?.data?.message || 'Unable to update beneficiary.', type: 'error' });
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/beneficiaries/${deleteItem.id}`);
      setToast({ message: `${deleteItem.beneficiaryName} removed.`, type: 'success' });
      setDeleteItem(null);
      load();
    } catch (e2) {
      setToast({ message: e2.response?.data?.message || 'Unable to delete beneficiary.', type: 'error' });
    }
  };

  return (
    <AppShell role="CUSTOMER" title="Beneficiaries" subtitle="Manage your saved beneficiaries.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      <div className="content-grid content-grid--wide">
        <SectionCard title="Beneficiaries" subtitle="Saved payout destinations for faster transfers.">
          <form className="stack-form" onSubmit={addBeneficiary}>
            <input placeholder="Beneficiary name" value={beneficiaryForm.beneficiaryName} onChange={e => setBeneficiaryForm(p => ({ ...p, beneficiaryName: e.target.value }))} />
            <input placeholder="Account number" maxLength={18} value={beneficiaryForm.beneficiaryAccountNo} onChange={e => setBeneficiaryForm(p => ({ ...p, beneficiaryAccountNo: e.target.value.replace(/\D/g, '') }))} />
            <input placeholder="IFSC" maxLength={11} value={beneficiaryForm.ifsc} onChange={e => setBeneficiaryForm(p => ({ ...p, ifsc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))} />
            <input placeholder="Bank name" value={beneficiaryForm.bankName} onChange={e => setBeneficiaryForm(p => ({ ...p, bankName: e.target.value }))} />
            <select value={beneficiaryForm.accountType} onChange={e => setBeneficiaryForm(p => ({ ...p, accountType: e.target.value }))}>
              <option value="SAVINGS">Savings</option>
              <option value="TERM">Term</option>
            </select>
            <button className="button button--secondary">Add beneficiary</button>
          </form>
          <div style={{ margin: '1rem 0 0.5rem' }}>
            <input
              placeholder="Search by name, account or bank…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', maxWidth: '360px' }}
            />
          </div>
          <div className="list-block">
            {(() => {
              const q = search.trim().toLowerCase();
              const list = (dashboard?.beneficiaries || []).filter(b =>
                !q ||
                b.beneficiaryName?.toLowerCase().includes(q) ||
                b.beneficiaryAccountNo?.toLowerCase().includes(q) ||
                b.bankName?.toLowerCase().includes(q)
              );
              if (!list.length) return <div className="empty-state">{search ? 'No beneficiaries match your search.' : 'No beneficiaries added yet.'}</div>;
              return list.map(item => (
              <div className="list-item" key={item.id}>
                <div><strong>{item.beneficiaryName}</strong><span>{maskAccount(item.beneficiaryAccountNo)} • {item.bankName}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="pill">{item.accountType}</span>
                  <button className="button button--sm button--ghost" onClick={() => openEdit(item)}>Edit</button>
                  <button className="button button--sm button--ghost-danger" onClick={() => setDeleteItem(item)}>Delete</button>
                </div>
              </div>
            ));
            })()}
          </div>
        </SectionCard>

        
      </div>

      {/* ── EDIT MODAL ── */}
      {editItem && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Edit Beneficiary</h3>
            <form className="stack-form" onSubmit={saveEdit}>
              <input placeholder="Beneficiary name" value={editForm.beneficiaryName} onChange={e => setEditForm(p => ({ ...p, beneficiaryName: e.target.value }))} required />
              <input placeholder="Account number" maxLength={18} value={editForm.beneficiaryAccountNo} onChange={e => setEditForm(p => ({ ...p, beneficiaryAccountNo: e.target.value.replace(/\D/g, '') }))} required />
              <input placeholder="IFSC" maxLength={11} value={editForm.ifsc} onChange={e => setEditForm(p => ({ ...p, ifsc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))} />
              <input placeholder="Bank name" value={editForm.bankName} onChange={e => setEditForm(p => ({ ...p, bankName: e.target.value }))} />
              <select value={editForm.accountType} onChange={e => setEditForm(p => ({ ...p, accountType: e.target.value }))}>
                <option value="SAVINGS">Savings</option>
                <option value="TERM">Term</option>
              </select>
              <div className="modal-actions">
                <button type="button" className="button button--ghost" onClick={() => setEditItem(null)}>Cancel</button>
                <button type="submit" className="button button--secondary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteItem && (
        <div className="modal-overlay" onClick={() => setDeleteItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Remove Beneficiary</h3>
            <p>Remove <strong>{deleteItem.beneficiaryName}</strong> ({maskAccount(deleteItem.beneficiaryAccountNo)}) from your saved beneficiaries?</p>
            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button className="button button--ghost" onClick={() => setDeleteItem(null)}>Cancel</button>
              <button className="button button--ghost-danger" onClick={confirmDelete}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
