package com.novabank.banking.dto.locker;

public record LockerAssignRequest(
        String assignedLocker,
        String adminNote
) {}
