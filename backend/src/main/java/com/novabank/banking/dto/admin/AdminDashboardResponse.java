package com.novabank.banking.dto.admin;

import com.novabank.banking.dto.transaction.TransactionResponse;

import java.math.BigDecimal;
import java.util.List;

public record AdminDashboardResponse(
        String adminName,
        long pendingRequests,
        long activeCustomers,
        long activeAccounts,
        BigDecimal totalDeposits,
        BigDecimal totalTransfersToday,
        List<PendingCustomerResponse> pendingApplications,
        List<TransactionResponse> recentTransactions
) {
}
