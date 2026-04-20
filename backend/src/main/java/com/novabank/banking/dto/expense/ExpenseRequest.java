package com.novabank.banking.dto.expense;

import java.math.BigDecimal;

public record ExpenseRequest(
        String description,
        BigDecimal amount,
        String category,
        String paymentMode,
        String expenseDate,
        String source,
        String transactionId
) {}
