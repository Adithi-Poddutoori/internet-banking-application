package com.novabank.banking.dto.customer;

import com.novabank.banking.dto.account.AccountResponse;
import com.novabank.banking.enums.CustomerStatus;
import com.novabank.banking.enums.Gender;

import java.time.LocalDateTime;
import java.util.List;

public record CustomerResponse(
        Long id,
        String customerName,
        String phoneNo,
        String emailId,
        Integer age,
        Gender gender,
        CustomerStatus status,
        String userId,
        LocalDateTime terminationNoticeDate,
        List<AccountResponse> accounts
) {
}
