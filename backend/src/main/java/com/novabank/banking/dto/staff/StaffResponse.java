package com.novabank.banking.dto.staff;

import java.time.LocalDateTime;

public record StaffResponse(
        Long id,
        String adminName,
        String adminEmailId,
        String adminContact,
        String username,
        String role,
        boolean active,
        LocalDateTime createdAt
) {}
