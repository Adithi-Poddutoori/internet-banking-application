package com.novabank.banking.dto.withdrawal;

import java.math.BigDecimal;

public record FdWithdrawalRequest(
        String depositTitle,
        String depositRef,
        BigDecimal amount,
        String accountNumber
) {}
