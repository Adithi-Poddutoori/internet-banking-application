package com.novabank.banking.dto.product;

import java.time.LocalDateTime;

public record ProductRequestResponse(
        Long id,
        String customerUsername,
        String customerName,
        String category,
        String productTitle,
        String status,
        String adminNote,
        LocalDateTime appliedOn,
        LocalDateTime decidedOn,
        boolean blocked,
        String formData
) {}
