package com.novabank.banking.dto.admin;

import com.novabank.banking.dto.transaction.TransactionResponse;

import java.math.BigDecimal;
import java.util.List;

public record TransactionReportResponse(
        long totalTransactions,
        BigDecimal totalCredits,
        BigDecimal totalDebits,
        List<TransactionResponse> transactions
) {
}
