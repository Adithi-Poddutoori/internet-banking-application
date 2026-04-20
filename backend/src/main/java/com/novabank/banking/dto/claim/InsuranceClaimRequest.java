package com.novabank.banking.dto.claim;

import java.math.BigDecimal;

public record InsuranceClaimRequest(
        String policy,
        String type,
        BigDecimal amount,
        String incidentDate,
        String description
) {}
