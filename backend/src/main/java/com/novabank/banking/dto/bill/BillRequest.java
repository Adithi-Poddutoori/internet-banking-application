package com.novabank.banking.dto.bill;

import java.math.BigDecimal;

public record BillRequest(
        String type,
        String nickname,
        String identifier,
        BigDecimal amount,
        String frequency,
        Integer dueDay,
        String dueTime,
        boolean autopay,
        String fromAccount
) {}
