import { useEffect, useState, useMemo } from 'react';
import AppShell from '../components/AppShell';
import SectionCard from '../components/SectionCard';
import Toast from '../components/Toast';
import api from '../services/api';

function ls(key, fb) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fb)); } catch { return fb; }
}

function daysAgo(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PRIORITY = {
  overdue: { label: 'Overdue', bg: '#fef2f2', border: '#fca5a5', color: '#e11d48', icon: '🚨' },
  urgent:  { label: 'Due today / tomorrow', bg: '#fffbeb', border: '#fcd34d', color: '#d97706', icon: '⚠️' },
  pending: { label: 'In progress', bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb', icon: 'ℹ️' },
};

function PriorityBadge({ level }) {
  const m = PRIORITY[level] || PRIORITY.pending;
  return (
    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
      {m.icon} {m.label}
    </span>
  );
}

export default function AdminFollowUpPage() {
  const [complaints, setComplaints] = useState([]);
  const [toast, setToast] = useState({ message: '', type: '' });

  useEffect(() => {
    api.get('/complaints/all').then(r => setComplaints(r.data?.data || [])).catch(() => {});
  }, []);

  // ── derive all items that need admin follow-up ──────────────────────────────

  const items = useMemo(() => {
    const result = [];
    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. Open complaints (within 2-3 business days SLA)
    for (const c of complaints) {
      if (c.status === 'RESOLVED' || c.status === 'CLOSED') continue;
      const age = daysAgo(c.createdAt);
      if (age === null) continue;
      result.push({
        id: `complaint_${c.id}`,
        section: 'Complaints',
        title: `Complaint #${c.id} — "${c.subject}"`,
        customer: c.customerName || c.customerUsername,
        detail: `Status: ${c.status.replace('_', ' ')} · Category: ${c.category || '—'}`,
        submittedOn: fmtDate(c.createdAt),
        daysOpen: age,
        sla: 3,
        priority: age > 3 ? 'overdue' : age >= 2 ? 'urgent' : 'pending',
        action: `Go to Complaints`,
        path: '/admin/complaints',
      });
    }

    // 2. Loan prepayments pending reflection
    const prepayments = ls('nova_loan_prepayments', []);
    for (const p of prepayments) {
      if (!p.reflectsAt || p.reflectsAt < todayStr) continue; // already reflected or overdue
      const daysLeft = Math.ceil((new Date(p.reflectsAt) - Date.now()) / 86400000);
      result.push({
        id: `prepay_${p.id || p.submittedAt}`,
        section: 'Loan Prepayments',
        title: `Prepayment for "${p.loan}"`,
        customer: p.customerName || p.username || '—',
        detail: `Amount: ₹${Number(p.amount).toLocaleString('en-IN')} · Reflects on: ${fmtDate(p.reflectsAt)}`,
        submittedOn: fmtDate(p.submittedAt),
        daysOpen: daysAgo(p.submittedAt),
        sla: 2,
        priority: daysLeft <= 0 ? 'overdue' : daysLeft <= 1 ? 'urgent' : 'pending',
        action: 'Go to Loans',
        path: '/admin/loans',
      });
    }

    // 3. Insurance claims
    const claims = ls('nova_insurance_claims', []);
    for (const cl of claims) {
      if (cl.status === 'SETTLED') continue;
      const age = daysAgo(cl.submittedAt);
      result.push({
        id: `claim_${cl.id}`,
        section: 'Insurance Claims',
        title: `Claim: ${cl.policy}`,
        customer: cl.username || '—',
        detail: `Amount: ₹${Number(cl.amount).toLocaleString('en-IN')} · Ref: ${cl.ref}`,
        submittedOn: fmtDate(cl.submittedAt),
        daysOpen: age,
        sla: 2,
        priority: age > 2 ? 'overdue' : age >= 1 ? 'urgent' : 'pending',
        action: null,
        path: null,
      });
    }

    // 4. Locker requests (3 working days SLA)
    const lockers = ls('nova_locker_requests', []);
    for (const lk of lockers) {
      if (lk.contacted) continue;
      const age = daysAgo(lk.submittedAt);
      result.push({
        id: `locker_${lk.id}`,
        section: 'Locker Requests',
        title: `Locker at ${lk.branch}`,
        customer: lk.username || '—',
        detail: `Branch: ${lk.branch}`,
        submittedOn: fmtDate(lk.submittedAt),
        daysOpen: age,
        sla: 3,
        priority: age > 3 ? 'overdue' : age >= 2 ? 'urgent' : 'pending',
        action: null,
        path: null,
      });
    }

    // 5. Premature deposit withdrawal requests (1 working day SLA)
    const withdrawals = ls('nova_premature_withdrawals', []);
    for (const w of withdrawals) {
      if (w.processed) continue;
      const age = daysAgo(w.submittedAt);
      result.push({
        id: `withdrawal_${w.id}`,
        section: 'Deposit Withdrawals',
        title: `Premature withdrawal: ${w.deposit}`,
        customer: w.customerName || w.username || '—',
        detail: `Amount pending credit after penalty deduction`,
        submittedOn: fmtDate(w.submittedAt),
        daysOpen: age,
        sla: 1,
        priority: age > 1 ? 'overdue' : age >= 1 ? 'urgent' : 'pending',
        action: null,
        path: null,
      });
    }

    // 6. Foreclosure requests (funds debited within 2 working days)
    const foreclosures = ls('nova_foreclosure_requests', []);
    for (const f of foreclosures) {
      if (f.processed) continue;
      const age = daysAgo(f.submittedAt);
      result.push({
        id: `foreclosure_${f.id}`,
        section: 'Loan Foreclosures',
        title: `Foreclosure: ${f.loan}`,
        customer: f.customerName || f.username || '—',
        detail: `Total payoff: ₹${Number(f.total).toLocaleString('en-IN')} (principal ₹${Number(f.outstanding).toLocaleString('en-IN')} + penalty ₹${Number(f.penalty).toLocaleString('en-IN')})`,
        submittedOn: fmtDate(f.submittedAt),
        daysOpen: age,
        sla: 2,
        priority: age > 2 ? 'overdue' : age >= 1 ? 'urgent' : 'pending',
        action: 'Go to Loans',
        path: '/admin/loans',
      });
    }

    // Sort: overdue first, then urgent, then pending; within each group sort by oldest
    const order = { overdue: 0, urgent: 1, pending: 2 };
    return result.sort((a, b) => (order[a.priority] - order[b.priority]) || (b.daysOpen - a.daysOpen));
  }, [complaints]);

  const overdue = items.filter(i => i.priority === 'overdue').length;
  const urgent  = items.filter(i => i.priority === 'urgent').length;

  const sections = ['Complaints', 'Loan Prepayments', 'Insurance Claims', 'Locker Requests', 'Deposit Withdrawals', 'Loan Foreclosures'];
  const grouped = sections.map(s => ({ section: s, items: items.filter(i => i.section === s) })).filter(g => g.items.length > 0);

  return (
    <AppShell role="ADMIN" title="Follow-up Queue" subtitle="Pending items that require admin attention within their SLA window.">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* Summary counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          ['Total Pending', items.length,  'var(--primary)'],
          ['🚨 Overdue',    overdue,        '#e11d48'],
          ['⚠️ Urgent',     urgent,         '#d97706'],
          ['✅ In-progress', items.length - overdue - urgent, '#16a34a'],
        ].map(([lbl, val, color]) => (
          <div key={lbl} style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 500, marginBottom: '0.3rem' }}>{lbl}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{val}</div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <SectionCard title="No pending items" subtitle="All follow-up tasks are clear.">
          <div className="empty-state" style={{ padding: '3rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
            <div>All items are within SLA. Nothing to action right now.</div>
          </div>
        </SectionCard>
      )}

      {grouped.map(({ section, items: sItems }) => (
        <SectionCard key={section} title={section} subtitle={`${sItems.length} item(s) pending`} style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sItems.map(item => {
              const meta = PRIORITY[item.priority] || PRIORITY.pending;
              return (
                <div key={item.id} style={{ padding: '0.9rem 1rem', borderRadius: '10px', border: `1.5px solid ${meta.border}`, background: meta.bg, display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '1.5rem', flexShrink: 0, marginTop: '0.1rem' }}>{meta.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.title}</span>
                      <PriorityBadge level={item.priority} />
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginBottom: '0.15rem' }}>
                      👤 {item.customer} · Submitted: {item.submittedOn}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{item.detail}</div>
                    <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: meta.color }}>
                      Open for {item.daysOpen ?? 0} day(s) · SLA: {item.sla} day(s)
                    </div>
                  </div>
                  {item.path && (
                    <a href={item.path} style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', flexShrink: 0, alignSelf: 'center', padding: '0.35rem 0.8rem', borderRadius: '6px', border: '1px solid var(--primary)', whiteSpace: 'nowrap' }}>
                      {item.action} →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      ))}
    </AppShell>
  );
}
