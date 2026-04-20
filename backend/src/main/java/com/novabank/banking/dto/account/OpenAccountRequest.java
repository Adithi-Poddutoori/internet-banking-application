package com.novabank.banking.dto.account;

import com.novabank.banking.enums.AccountType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record OpenAccountRequest(
        @NotNull(message = "Account type is required")
        AccountType accountType,

        @NotNull(message = "Opening deposit is required")
        @DecimalMin(value = "0.00", message = "Opening deposit cannot be negative")
        BigDecimal openingDeposit,

        Integer termMonths
) {}
