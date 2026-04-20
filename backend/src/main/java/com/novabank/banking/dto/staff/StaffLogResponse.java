package com.novabank.banking.dto.staff;

import java.time.LocalDateTime;

public record StaffLogResponse(
        Long id,
        String action,
        Long targetAdminId,
        String targetAdminName,
        String targetUsername,
        String performedBy,
        String details,
        LocalDateTime performedAt
) {}
