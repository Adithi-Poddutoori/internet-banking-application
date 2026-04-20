package com.novabank.banking.dto.reward;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record RedemptionResponse(
        Long id,
        String customerUsername,
        String mode,
        Integer points,
        BigDecimal value,
        String brand,
        String voucherCode,
        LocalDateTime redeemedAt
) {}
