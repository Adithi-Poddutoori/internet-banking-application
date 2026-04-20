import { useEffect, useState, useMemo } from 'react';
import { useAutoRefresh } from '../utils/useAutoRefresh';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';

const STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'DECLINED', 'BLOCKED'];

export default function AdminCustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [nameQuery, setNameQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toast, setToast] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/customers');
      setCustomers(data.data);
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Unable to load customers.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useAutoRefresh(load, 5000);

  const filtered = useMemo(() => {
    return customers.filter(c => {
      const matchName = !nameQuery || c.customerName?.toLowerCase().includes(nameQuery.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchName && matchStatus;
    });
  }, [customers, nameQuery, statusFilter]);

  return (
    <AppShell role="ADMIN" title="Customers" subtitle="Browse and manage customer portfolios.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      <SectionCard
        title="Customer portfolio"
        subtitle="Search by name, filter by status, then click a customer to view details."
        actions={
          <div className="filters-row">
            <input
              type="text"
              placeholder="Search by name…"
              value={nameQuery}
              onChange={e => setNameQuery(e.target.value)}
            />
            <button className="button button--secondary" onClick={load}>↻ Refresh</button>
          </div>
        }
      >
        {/* Status filter chips */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {STATUS_FILTERS.map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`button button--small ${statusFilter === st ? 'button--secondary' : 'button--ghost'}`}
              style={statusFilter === st && st !== 'ALL' ? {
                background: st === 'BLOCKED' ? 'rgba(109,40,217,0.14)' : undefined,
                color: st === 'BLOCKED' ? '#7c3aed' : undefined,
              } : {}}
            >
              {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
              {st !== 'ALL' && (
                <span style={{ marginLeft: '0.3rem', opacity: 0.65, fontSize: '0.75rem' }}>
                  ({customers.filter(c => c.status === st).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? <div className="empty-state">Loading customers...</div> : (
          <div className="list-block">
            {filtered.length ? filtered.map(customer => (
              <div
                key={customer.id}
                className="list-item list-item--clickable"
                onClick={() => navigate(`/admin/customers/${customer.id}`)}
              >
                <div className="list-item__info">
                  <strong>{customer.customerName}</strong>
                  <span>{customer.emailId} • {customer.phoneNo} • {customer.userId}</span>
                  {customer.accounts?.length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {customer.accounts.map(acc => (
                        <span key={acc.accountNumber} className={`pill pill--${acc.status.toLowerCase()}`}>
                          {acc.accountNumber} • {acc.accountType} • {formatCurrency(acc.balance)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="list-item__actions" onClick={e => e.stopPropagation()}>
                  <span className={`pill pill--${customer.status.toLowerCase()}`}>{customer.status}</span>
                  {customer.terminationNoticeDate && (
                    <span className="pill" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.72rem' }}>⚠️ Notice sent</span>
                  )}
                  <button className="button button--secondary button--small" onClick={() => navigate(`/admin/customers/${customer.id}`)}>
                    View details
                  </button>
                </div>
              </div>
            )) : (
              <div className="empty-state">
                {nameQuery || statusFilter !== 'ALL'
                  ? 'No customers match the current filters.'
                  : 'No customers found.'}
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </AppShell>
  );
}
