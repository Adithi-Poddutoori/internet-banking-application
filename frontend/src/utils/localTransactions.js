// Local transaction log — stores transfers made via the frontend.
// TransactionsPage merges these with API transactions so payments always show immediately.

const KEY = 'nova_local_transactions';

export function getLocalTransactions(accountNumber) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!accountNumber) return all;
    return all.filter(
      t => t.fromAccountNumber === accountNumber || t.toAccountNumber === accountNumber
    );
  } catch {
    return [];
  }
}

export function addLocalTransaction(tx) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    // Normalize: ensure both `type` and `transactionType` fields are set
    const resolvedType = tx.transactionType || tx.type || 'DEBIT';
    const normalized = {
      ...tx,
      _local: true,
      transactionType: resolvedType,
      type: resolvedType,
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
    all.unshift(normalized);
    // Keep only last 200 entries
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, 200)));
  } catch { /* ignore */ }
}

export function clearLocalTransactions() {
  localStorage.removeItem(KEY);
}
