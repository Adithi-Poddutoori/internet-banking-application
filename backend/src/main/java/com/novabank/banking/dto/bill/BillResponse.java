package com.novabank.banking.dto.bill;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record BillResponse(
        Long id,
        String customerUsername,
        String customerName,
        String type,
        String nickname,
        String identifier,
        BigDecimal amount,
        String frequency,
        Integer dueDay,
        String dueTime,
        boolean autopay,
        String fromAccount,
        LocalDateTime lastPaid,
        String historyJson,
        LocalDateTime createdAt
) {}
