package com.novabank.banking.dto.reward;

import java.math.BigDecimal;

public record RedemptionRequest(
        String mode,
        Integer points,
        BigDecimal value,
        String brand,
        String voucherCode
) {}
