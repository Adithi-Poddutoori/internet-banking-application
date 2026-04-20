package com.novabank.banking.controller;

import com.novabank.banking.dto.account.AccountResponse;
import com.novabank.banking.dto.account.AdminUpdateAccountRequest;
import com.novabank.banking.dto.admin.AdminDashboardResponse;
import com.novabank.banking.dto.admin.AdminProfileResponse;
import com.novabank.banking.dto.admin.ApprovalDecisionRequest;
import com.novabank.banking.dto.admin.DeletedAccountLogResponse;
import com.novabank.banking.dto.admin.InterestCalculationResponse;
import com.novabank.banking.dto.admin.PendingCustomerResponse;
import com.novabank.banking.dto.admin.TransactionReportResponse;
import com.novabank.banking.dto.admin.TransferAndDeleteRequest;
import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.dto.customer.AdminUpdateCustomerRequest;
import com.novabank.banking.dto.customer.CustomerResponse;
import com.novabank.banking.entity.BankAccount;
import com.novabank.banking.repository.AccountRepository;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.AdminService;
import com.novabank.banking.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin")
public class AdminController {

    private final AdminService adminService;
    private final CustomerService customerService;
    private final SecurityUtils securityUtils;
    private final AccountRepository accountRepository;

    @GetMapping("/me")
    @Operation(summary = "Get current admin profile")
    public ResponseEntity<ApiResponse<AdminProfileResponse>> myProfile() {
        return ResponseEntity.ok(new ApiResponse<>(
                "Admin profile loaded",
                adminService.getAdminProfile(securityUtils.currentUsername())
        ));
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Get admin dashboard summary")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> dashboard() {
        return ResponseEntity.ok(new ApiResponse<>(
                "Admin dashboard loaded",
                adminService.getDashboard(securityUtils.currentUsername())
        ));
    }

    @GetMapping("/applications/pending")
    @Operation(summary = "Get all pending customer applications")
    public ResponseEntity<ApiResponse<List<PendingCustomerResponse>>> pendingApplications() {
        return ResponseEntity.ok(new ApiResponse<>(
                "Pending applications loaded",
                adminService.getPendingApplications()
        ));
    }

    @PostMapping("/customers/{customerId}/approve")
    @Operation(summary = "Approve a pending customer application")
    public ResponseEntity<ApiResponse<CustomerResponse>> approveCustomer(
            @PathVariable Long customerId,
            @Valid @RequestBody(required = false) ApprovalDecisionRequest request
    ) {
        String remarks = request != null ? request.remarks() : null;
        return ResponseEntity.ok(new ApiResponse<>(
                "Customer application approved",
                adminService.approveCustomer(customerId, remarks)
        ));
    }

    @PostMapping("/customers/{customerId}/decline")
    @Operation(summary = "Decline a pending customer application")
    public ResponseEntity<ApiResponse<CustomerResponse>> declineCustomer(
            @PathVariable Long customerId,
            @Valid @RequestBody(required = false) ApprovalDecisionRequest request
    ) {
        String remarks = request != null ? request.remarks() : null;
        return ResponseEntity.ok(new ApiResponse<>(
                "Customer application declined",
                adminService.declineCustomer(customerId, remarks)
        ));
    }

    @GetMapping("/customers")
    @Operation(summary = "List all customers, optionally filtered by minimum account balance")
    public ResponseEntity<ApiResponse<List<CustomerResponse>>> listCustomers(
            @RequestParam(required = false) BigDecimal minBalance
    ) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Customers loaded",
                customerService.listAllCustomers(minBalance)
        ));
    }

    @GetMapping("/customers/{customerId}")
    @Operation(summary = "Find customer by ID")
    public ResponseEntity<ApiResponse<CustomerResponse>> findCustomerById(@PathVariable Long customerId) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Customer loaded",
                customerService.findCustomerById(customerId)
        ));
    }

    @PutMapping("/customers/{customerId}")
    @Operation(summary = "Admin — update customer name, email, and phone")
    public ResponseEntity<ApiResponse<CustomerResponse>> adminUpdateCustomer(
            @PathVariable Long customerId,
            @RequestBody AdminUpdateCustomerRequest request
    ) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Customer updated",
                customerService.adminUpdateCustomer(customerId, request)
        ));
    }

    @GetMapping("/customers/by-account/{accountNumber}")
    @Operation(summary = "View customer details by account number")
    public ResponseEntity<ApiResponse<CustomerResponse>> viewCustomerByAccount(@PathVariable String accountNumber) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Customer details loaded",
                customerService.viewCustomerDetailsByAccount(accountNumber)
        ));
    }

    @GetMapping("/accounts/{accountNumber}/interest")
    @Operation(summary = "Calculate estimated interest for a savings or term account")
    public ResponseEntity<ApiResponse<InterestCalculationResponse>> calculateInterest(@PathVariable String accountNumber) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Interest calculated",
                adminService.calculateInterest(accountNumber)
        ));
    }

    @GetMapping("/reports/transactions")
    @Operation(summary = "Generate transaction report for a date range")
    public ResponseEntity<ApiResponse<TransactionReportResponse>> transactionReport(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to
    ) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Transaction report generated",
                adminService.generateTransactionReport(from, to)
        ));
    }

    @PostMapping("/customers/{customerId}/block")
    @Operation(summary = "Block a customer — immediately prevents all login and banking access")
    public ResponseEntity<ApiResponse<CustomerResponse>> blockCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Customer has been blocked",
                adminService.blockCustomer(customerId)
        ));
    }

    @PostMapping("/customers/{customerId}/unblock")
    @Operation(summary = "Unblock a customer — restores access")
    public ResponseEntity<ApiResponse<CustomerResponse>> unblockCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Customer has been unblocked",
                adminService.unblockCustomer(customerId)
        ));
    }

    @PostMapping("/customers/{customerId}/notify")
    @Operation(summary = "Send inactivity termination notice to a customer (sets 21-day auto-delete timer)")
    public ResponseEntity<ApiResponse<CustomerResponse>> notifyCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Termination notice sent to customer",
                adminService.sendTerminationNotice(customerId)
        ));
    }

    @DeleteMapping("/customers/{customerId}/notify")
    @Operation(summary = "Cancel termination notice for a customer")
    public ResponseEntity<ApiResponse<CustomerResponse>> cancelNotice(@PathVariable Long customerId) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Termination notice cancelled",
                adminService.cancelTerminationNotice(customerId)
        ));
    }

    @GetMapping("/customers/{customerId}/deleted-accounts")
    @Operation(summary = "Get deleted account history for a customer")
    public ResponseEntity<ApiResponse<List<DeletedAccountLogResponse>>> getDeletedAccountLogs(
            @PathVariable Long customerId) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Deleted account logs retrieved",
                adminService.getDeletedAccountLogs(customerId)
        ));
    }

    @DeleteMapping("/accounts/{accountNumber}")
    @Operation(summary = "Delete a customer account (admin only)")
    public ResponseEntity<ApiResponse<AccountResponse>> deleteAccount(@PathVariable String accountNumber) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Account deleted successfully",
                adminService.deleteAccount(accountNumber)
        ));
    }

    @PutMapping("/accounts/{accountNumber}")
    @Operation(summary = "Admin — update account status and/or interest rate")
    public ResponseEntity<ApiResponse<AccountResponse>> updateAccount(
            @PathVariable String accountNumber,
            @RequestBody AdminUpdateAccountRequest request) {
        BankAccount account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new RuntimeException("Account not found: " + accountNumber));
        if (request.status() != null && !request.status().isBlank()) {
            account.setAccountStatus(com.novabank.banking.enums.AccountStatus.valueOf(request.status()));
        }
        if (request.interestRate() != null) {
            account.setInterestRate(request.interestRate());
        }
        accountRepository.save(account);
        return ResponseEntity.ok(new ApiResponse<>("Account updated",
                com.novabank.banking.mapper.BankingMapper.toAccountResponse(account)));
    }

    @PostMapping("/accounts/{accountNumber}/transfer-and-delete")
    @Operation(summary = "Transfer remaining balance to another account and delete (admin only)")
    public ResponseEntity<ApiResponse<AccountResponse>> transferAndDeleteAccount(
            @PathVariable String accountNumber,
            @RequestBody TransferAndDeleteRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Balance transferred and account deleted successfully",
                adminService.transferAndDeleteAccount(accountNumber, request.targetAccountNumber())
        ));
    }

    @DeleteMapping("/customers/{customerId}")
    @Operation(summary = "Delete a customer and their user account (admin only)")
    public ResponseEntity<ApiResponse<CustomerResponse>> deleteCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Customer deleted successfully",
                adminService.deleteCustomer(customerId)
        ));
    }
}
