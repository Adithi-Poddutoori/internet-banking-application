/**
 * Frontend fraud/suspicion heuristics.
 * Returns an array of alert objects: { id, type, title, message, severity, txRef }
 */

const LARGE_TX_THRESHOLD = 50000;   // single transaction > ₹50,000
const RAPID_WINDOW_MS    = 5 * 60 * 1000; // 5 minutes
const RAPID_TX_COUNT     = 3;       // 3+ debits within the window

export function detectFraud(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];
  const alerts = [];
  const seen = new Set();

  const addAlert = (id, type, title, message, severity, txRef) => {
    if (seen.has(id)) return;
    seen.add(id);
    alerts.push({ id, type, title, message, severity, txRef });
  };

  // 1. Large single transaction
  for (const tx of transactions) {
    if (Number(tx.amount) >= LARGE_TX_THRESHOLD && isDebit(tx)) {
      addAlert(
        `large_${tx.transactionReference}`,
        'LARGE_TRANSACTION',
        'Large transaction detected',
        `A debit of ₹${fmtAmt(tx.amount)} was made on ${fmtDate(tx.transactionDateAndTime)} via ${fmtType(tx.transactionType)}. If this was not you, contact support immediately.`,
        'high',
        tx.transactionReference
      );
    }
  }

  // 2. Multiple rapid debits in short window
  const debits = transactions.filter(isDebit).sort((a, b) =>
    new Date(a.transactionDateAndTime) - new Date(b.transactionDateAndTime)
  );
  for (let i = 0; i < debits.length; i++) {
    const t0 = new Date(debits[i].transactionDateAndTime).getTime();
    let count = 1;
    const refs = [debits[i].transactionReference];
    for (let j = i + 1; j < debits.length; j++) {
      const t1 = new Date(debits[j].transactionDateAndTime).getTime();
      if (t1 - t0 <= RAPID_WINDOW_MS) { count++; refs.push(debits[j].transactionReference); }
      else break;
    }
    if (count >= RAPID_TX_COUNT) {
      const key = `rapid_${refs.sort().join('_')}`;
      addAlert(
        key,
        'RAPID_TRANSACTIONS',
        'Multiple rapid transactions',
        `${count} debit transactions were made within a 5-minute window starting ${fmtDate(debits[i].transactionDateAndTime)}. Verify these were authorised by you.`,
        'medium',
        debits[i].transactionReference
      );
    }
  }

  // 3. Late-night transactions (11 PM – 5 AM)
  for (const tx of transactions) {
    if (!isDebit(tx)) continue;
    const hour = new Date(tx.transactionDateAndTime).getHours();
    if (hour >= 23 || hour < 5) {
      addAlert(
        `latenight_${tx.transactionReference}`,
        'UNUSUAL_TIME',
        'Late-night transaction',
        `A transaction of ₹${fmtAmt(tx.amount)} occurred at ${fmtTime(tx.transactionDateAndTime)} (outside normal banking hours). Verify this was you.`,
        'low',
        tx.transactionReference
      );
    }
  }

  return alerts;
}

function isDebit(tx) {
  return ['WITHDRAWAL', 'TRANSFER_OUT', 'NEFT', 'IMPS', 'RTGS'].includes(tx.transactionType);
}

function fmtAmt(n) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function fmtType(t) {
  return (t || '').replaceAll('_', ' ');
}
