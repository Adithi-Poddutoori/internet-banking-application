package com.novabank.banking.mapper;

import com.novabank.banking.entity.SavingsAccount;
import com.novabank.banking.enums.AccountStatus;
import com.novabank.banking.enums.AccountType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BankingMapperTests {

    @Test
    void shouldEstimateSavingsInterest() {
        SavingsAccount account = SavingsAccount.builder()
                .accountNumber("741001111111")
                .accountType(AccountType.SAVINGS)
                .balance(new BigDecimal("10000.00"))
                .interestRate(new BigDecimal("3.50"))
                .dateOfOpening(LocalDate.now())
                .accountStatus(AccountStatus.ACTIVE)
                .minimumBalance(new BigDecimal("1000.00"))
                .penaltyFee(new BigDecimal("250.00"))
                .build();

        assertEquals(new BigDecimal("350.00"), BankingMapper.estimateInterest(account));
    }
}
