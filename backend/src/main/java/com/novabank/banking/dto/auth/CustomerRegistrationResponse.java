package com.novabank.banking.dto.auth;

import com.novabank.banking.enums.CustomerStatus;

public record CustomerRegistrationResponse(
        Long applicationId,
        String customerName,
        String generatedAccountNumber,
        String generatedUserId,
        String generatedPassword,
        CustomerStatus status,
        String message
) {
}
