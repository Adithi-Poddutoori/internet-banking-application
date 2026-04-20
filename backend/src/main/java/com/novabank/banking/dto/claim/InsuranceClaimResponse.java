package com.novabank.banking.dto.claim;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record InsuranceClaimResponse(
        Long id,
        String ref,
        String customerUsername,
        String customerName,
        String policy,
        String type,
        BigDecimal amount,
        LocalDate incidentDate,
        String description,
        String status,
        LocalDateTime submittedAt,
        LocalDateTime updatedAt
) {}
