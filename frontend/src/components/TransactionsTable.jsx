import { formatCurrency, formatDateTime, maskAccount } from '../utils/formatters';

export default function TransactionsTable({ rows }) {
  if (!rows?.length) {
    return <div className="empty-state">No transactions available for the selected view.</div>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Account</th>
            <th>Type</th>
            <th>Counterparty</th>
            <th>Amount</th>
            <th>When</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.transactionReference || row.id || idx}>
              <td>
                <div className="table-primary">{row.transactionReference}</div>
                <div className="table-secondary">{row.transactionRemarks || 'Transaction'}</div>
              </td>
              <td>{maskAccount(row.accountNumber)}</td>
              <td>
                <span className={`pill pill--${String(row.transactionType || '').toLowerCase()}`}>
                  {row.transactionType?.replaceAll('_', ' ')}
                </span>
              </td>
              <td>{row.counterpartyAccountNumber ? maskAccount(row.counterpartyAccountNumber) : '—'}</td>
              <td>{formatCurrency(row.amount)}</td>
              <td>{formatDateTime(row.transactionDateAndTime)}</td>
              <td>{row.transactionStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
