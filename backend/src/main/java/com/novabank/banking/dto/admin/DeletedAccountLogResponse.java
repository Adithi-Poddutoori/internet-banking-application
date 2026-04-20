package com.novabank.banking.dto.admin;

import com.novabank.banking.enums.AccountType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record DeletedAccountLogResponse(
        Long id,
        String accountNumber,
        AccountType accountType,
        BigDecimal balanceAtDeletion,
        String transferredToAccountNumber,
        Long customerId,
        String customerName,
        LocalDateTime deletedAt
) {}
