package com.novabank.banking.dto.admin;

import com.novabank.banking.enums.AccountType;
import com.novabank.banking.enums.CustomerStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PendingCustomerResponse(
        Long customerId,
        String customerName,
        String emailId,
        String phoneNo,
        AccountType requestedAccountType,
        String accountNumber,
        BigDecimal openingDeposit,
        LocalDate requestedOn,
        CustomerStatus status
) {
}
