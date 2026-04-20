package com.novabank.banking.dto.prepayment;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record LoanPrepaymentResponse(
        Long id,
        String customerUsername,
        String customerName,
        String loanTitle,
        String loanRef,
        BigDecimal amount,
        String accountNumber,
        String ref,
        String status,
        LocalDateTime appliedOn,
        LocalDateTime decidedAt
) {}
