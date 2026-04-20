package com.novabank.banking.service;

import com.novabank.banking.dto.account.AccountResponse;
import com.novabank.banking.dto.admin.AdminDashboardResponse;
import com.novabank.banking.dto.admin.AdminProfileResponse;
import com.novabank.banking.dto.admin.DeletedAccountLogResponse;
import com.novabank.banking.dto.admin.InterestCalculationResponse;
import com.novabank.banking.dto.admin.PendingCustomerResponse;
import com.novabank.banking.dto.admin.TransactionReportResponse;
import com.novabank.banking.dto.customer.CustomerResponse;

import java.time.LocalDate;
import java.util.List;

public interface AdminService {

    AdminDashboardResponse getDashboard(String username);

    AdminProfileResponse getAdminProfile(String username);

    List<PendingCustomerResponse> getPendingApplications();

    CustomerResponse approveCustomer(Long customerId, String remarks);

    CustomerResponse declineCustomer(Long customerId, String remarks);

    InterestCalculationResponse calculateInterest(String accountNumber);

    TransactionReportResponse generateTransactionReport(LocalDate from, LocalDate to);

    AccountResponse deleteAccount(String accountNumber);

    AccountResponse transferAndDeleteAccount(String accountNumber, String targetAccountNumber);

    CustomerResponse sendTerminationNotice(Long customerId);

    CustomerResponse cancelTerminationNotice(Long customerId);

    List<DeletedAccountLogResponse> getDeletedAccountLogs(Long customerId);

    CustomerResponse blockCustomer(Long customerId);

    CustomerResponse unblockCustomer(Long customerId);

    CustomerResponse deleteCustomer(Long customerId);
}
