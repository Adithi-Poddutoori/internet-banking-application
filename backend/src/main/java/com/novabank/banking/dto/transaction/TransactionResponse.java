package com.novabank.banking.dto.transaction;

import com.novabank.banking.enums.TransactionStatus;
import com.novabank.banking.enums.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransactionResponse(
        Long id,
        String transactionReference,
        String accountNumber,
        BigDecimal amount,
        TransactionType transactionType,
        LocalDateTime transactionDateAndTime,
        TransactionStatus transactionStatus,
        String transactionRemarks,
        String counterpartyAccountNumber,
        BigDecimal balanceAfterTransaction
) {
}
