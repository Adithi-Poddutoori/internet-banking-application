package com.novabank.banking.dto.complaint;

import java.time.LocalDateTime;

public record ComplaintResponse(
        Long id,
        String subject,
        String description,
        String priority,
        String status,
        String adminNote,
        String customerName,
        String customerUsername,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
