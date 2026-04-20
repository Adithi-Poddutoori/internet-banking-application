import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';

const labelMap = {
  customer: 'Dashboard',
  admin: 'Dashboard',
  accounts: 'Accounts',
  deposit: 'Deposit / Withdraw',
  transfer: 'Fund Transfer',
  transactions: 'Transactions',
  beneficiaries: 'Beneficiaries',
  profile: 'Profile',
  approvals: 'Approvals',
  reports: 'Reports',
  customers: 'Customers',
  rewards: 'Rewards & Benefits',
  loans: 'Loans',
  investments: 'Investments',
  deposits: 'Deposits',
  insurance: 'Insurance',
  cards: 'Cards'
};

function buildLabel(seg) {
  return labelMap[seg] || seg.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const fromPath = searchParams.get('from');
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = useMemo(() => {
    const result = segments.map((seg, i) => {
      const path = '/' + segments.slice(0, i + 1).join('/');
      const label = buildLabel(seg);
      const isLast = i === segments.length - 1;
      return { path, label, isLast };
    });

    // If we came from account details, inject Accounts + account crumb before the last crumb
    if (fromPath && fromPath.startsWith('/customer/accounts/')) {
      const acctNum = fromPath.split('/').pop();
      const accountsCrumb = { path: '/customer/accounts', label: 'Accounts', isLast: false };
      const fromCrumb = { path: fromPath, label: `Account ${acctNum}`, isLast: false };
      const lastIdx = result.length - 1;
      if (result[lastIdx]) result[lastIdx].isLast = true;
      const accountsIdx = result.findIndex(c => c.path === '/customer/accounts');
      if (accountsIdx >= 0) {
        // Already has Accounts in path — just insert the account detail crumb after it
        if (!result.some(c => c.path === fromPath)) {
          result.splice(accountsIdx + 1, 0, fromCrumb);
        }
      } else {
        // No Accounts crumb — inject both Accounts and Account detail before last crumb
        result.splice(lastIdx, 0, accountsCrumb, fromCrumb);
      }
    }
    return result;
  }, [pathname, fromPath]);

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => (
        <span key={crumb.path}>
          {i > 0 && <span className="breadcrumbs__sep">/</span>}
          {crumb.isLast ? (
            <span className="breadcrumbs__current">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="breadcrumbs__link">{crumb.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
