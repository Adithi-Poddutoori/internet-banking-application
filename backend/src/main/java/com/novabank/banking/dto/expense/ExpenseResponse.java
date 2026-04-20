package com.novabank.banking.dto.expense;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ExpenseResponse(
        Long id,
        String customerUsername,
        String description,
        BigDecimal amount,
        String category,
        String paymentMode,
        LocalDate expenseDate,
        String source,
        String transactionId,
        LocalDateTime createdAt
) {}
