package com.novabank.banking.dto.withdrawal;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record FdWithdrawalResponse(
        Long id,
        String customerUsername,
        String customerName,
        String depositTitle,
        String depositRef,
        BigDecimal amount,
        String accountNumber,
        String ref,
        String status,
        LocalDateTime withdrawnAt,
        LocalDateTime decidedAt
) {}
