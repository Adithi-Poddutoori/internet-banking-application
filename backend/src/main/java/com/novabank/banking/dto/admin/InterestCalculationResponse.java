package com.novabank.banking.dto.admin;

import com.novabank.banking.enums.AccountType;

import java.math.BigDecimal;

public record InterestCalculationResponse(
        String accountNumber,
        AccountType accountType,
        BigDecimal interestRate,
        BigDecimal balanceOrPrincipal,
        BigDecimal estimatedAnnualInterest,
        String note
) {
}
