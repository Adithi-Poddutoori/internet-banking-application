package com.novabank.banking.dto.prepayment;

import java.math.BigDecimal;

public record LoanPrepaymentRequest(
        String loanTitle,
        String loanRef,
        BigDecimal amount,
        String accountNumber
) {}
