import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import KycPage from './pages/KycPage';
import OnboardingPage from './pages/OnboardingPage';
import CustomerDashboardPage from './pages/CustomerDashboardPage';
import AccountsPage from './pages/AccountsPage';
import AccountDetailPage from './pages/AccountDetailPage';
import TransferPage from './pages/TransferPage';
import TransactionsPage from './pages/TransactionsPage';
import BeneficiariesPage from './pages/BeneficiariesPage';
import ProfilePage from './pages/ProfilePage';
import RewardsPage from './pages/RewardsPage';
import LoansPage from './pages/LoansPage';
import InvestmentsPage from './pages/InvestmentsPage';
import DepositsPage from './pages/DepositsPage';
import InsurancePage from './pages/InsurancePage';
import CardsPage from './pages/CardsPage';
import NotificationsPage from './pages/NotificationsPage';
import PassbookChequebookPage from './pages/PassbookChequebookPage';
import ExpenseTrackerPage from './pages/ExpenseTrackerPage';
import AdminOverviewPage from './pages/AdminOverviewPage';
import AdminApprovalsPage from './pages/AdminApprovalsPage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminCustomersPage from './pages/AdminCustomersPage';
import AdminCustomerDetailPage from './pages/AdminCustomerDetailPage';
import AdminProfilePage from './pages/AdminProfilePage';
import AdminComplaintsPage from './pages/AdminComplaintsPage';
import AdminTransactionsPage from './pages/AdminTransactionsPage';
import AdminLoansPage from './pages/AdminLoansPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import AdminStaffPage from './pages/AdminStaffPage';
import BillsPage from './pages/BillsPage';
import CreditScorePage from './pages/CreditScorePage';
import ComplaintsPage from './pages/ComplaintsPage';
import ProtectedRoute from './routes/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function DefaultRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/customer'} replace />;
}

function CustomerRoute({ children }) {
  return <ProtectedRoute role="CUSTOMER">{children}</ProtectedRoute>;
}

function AdminRoute({ children }) {
  return <ProtectedRoute role="ADMIN">{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/kyc" element={<KycPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      {/* Customer routes */}
      <Route path="/customer" element={<CustomerRoute><CustomerDashboardPage /></CustomerRoute>} />
      <Route path="/customer/accounts" element={<CustomerRoute><AccountsPage /></CustomerRoute>} />
      <Route path="/customer/accounts/:accountNumber" element={<CustomerRoute><AccountDetailPage /></CustomerRoute>} />
      <Route path="/customer/transfer" element={<CustomerRoute><TransferPage /></CustomerRoute>} />
      <Route path="/customer/transactions" element={<CustomerRoute><TransactionsPage /></CustomerRoute>} />
      <Route path="/customer/beneficiaries" element={<CustomerRoute><BeneficiariesPage /></CustomerRoute>} />
      <Route path="/customer/profile" element={<CustomerRoute><ProfilePage /></CustomerRoute>} />
      <Route path="/customer/rewards" element={<CustomerRoute><RewardsPage /></CustomerRoute>} />
      <Route path="/customer/loans" element={<CustomerRoute><LoansPage /></CustomerRoute>} />
      <Route path="/customer/investments" element={<CustomerRoute><InvestmentsPage /></CustomerRoute>} />
      <Route path="/customer/deposits" element={<CustomerRoute><DepositsPage /></CustomerRoute>} />
      <Route path="/customer/insurance" element={<CustomerRoute><InsurancePage /></CustomerRoute>} />
      <Route path="/customer/cards" element={<CustomerRoute><CardsPage /></CustomerRoute>} />
      <Route path="/customer/notifications" element={<CustomerRoute><NotificationsPage /></CustomerRoute>} />
      <Route path="/customer/passbook" element={<CustomerRoute><PassbookChequebookPage /></CustomerRoute>} />
      <Route path="/customer/expenses" element={<CustomerRoute><ExpenseTrackerPage /></CustomerRoute>} />
      <Route path="/customer/bills" element={<CustomerRoute><BillsPage /></CustomerRoute>} />
      <Route path="/customer/credit-score" element={<CustomerRoute><CreditScorePage /></CustomerRoute>} />
      <Route path="/customer/complaints" element={<CustomerRoute><ComplaintsPage /></CustomerRoute>} />
      {/* Admin routes */}
      <Route path="/admin" element={<AdminRoute><AdminOverviewPage /></AdminRoute>} />
      <Route path="/admin/approvals" element={<AdminRoute><AdminApprovalsPage /></AdminRoute>} />
      <Route path="/admin/reports" element={<AdminRoute><AdminReportsPage /></AdminRoute>} />
      <Route path="/admin/customers" element={<AdminRoute><AdminCustomersPage /></AdminRoute>} />
      <Route path="/admin/customers/:customerId" element={<AdminRoute><AdminCustomerDetailPage /></AdminRoute>} />
      <Route path="/admin/profile" element={<AdminRoute><AdminProfilePage /></AdminRoute>} />
      <Route path="/admin/complaints" element={<AdminRoute><AdminComplaintsPage /></AdminRoute>} />
      <Route path="/admin/transactions" element={<AdminRoute><AdminTransactionsPage /></AdminRoute>} />
      <Route path="/admin/loans" element={<AdminRoute><AdminLoansPage /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
      <Route path="/admin/staff" element={<AdminRoute><AdminStaffPage /></AdminRoute>} />
      <Route path="*" element={<DefaultRedirect />} />
    </Routes>
  );
}
