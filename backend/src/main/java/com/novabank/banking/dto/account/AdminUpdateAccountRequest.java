package com.novabank.banking.dto.account;

import java.math.BigDecimal;

public record AdminUpdateAccountRequest(
        String status,
        BigDecimal interestRate
) {}
