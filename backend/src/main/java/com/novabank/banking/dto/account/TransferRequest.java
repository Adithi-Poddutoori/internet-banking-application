package com.novabank.banking.dto.account;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record TransferRequest(
        @NotBlank(message = "From account number is required")
        String fromAccountNumber,

        @NotBlank(message = "To account number is required")
        String toAccountNumber,

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "1.00", message = "Transfer amount must be greater than zero")
        BigDecimal amount,

        @Size(max = 120, message = "Remarks cannot exceed 120 characters")
        String remarks,

        String transferMode
) {
}
