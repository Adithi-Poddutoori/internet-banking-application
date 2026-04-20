package com.novabank.banking.dto.account;

import com.novabank.banking.enums.AccountType;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AccountResponse(
        String accountNumber,
        AccountType accountType,
        BigDecimal balance,
        BigDecimal interestRate,
        String status,
        LocalDate dateOfOpening,
        BigDecimal minimumBalance,
        BigDecimal penaltyFee,
        BigDecimal principalAmount,
        Integer termMonths,
        BigDecimal penaltyAmount,
        BigDecimal estimatedInterest
) {
}
