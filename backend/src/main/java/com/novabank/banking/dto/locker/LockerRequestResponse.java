package com.novabank.banking.dto.locker;

import java.time.LocalDateTime;

public record LockerRequestResponse(
        Long id,
        String customerUsername,
        String customerName,
        String branch,
        String size,
        String status,
        String assignedLocker,
        String adminNote,
        LocalDateTime requestedAt,
        LocalDateTime decidedAt
) {}
