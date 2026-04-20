package com.novabank.banking.dto.broadcast;

import java.time.LocalDateTime;

public record BroadcastResponse(
        Long id,
        String sentByUsername,
        String title,
        String message,
        String type,
        String target,
        String accountNumber,
        LocalDateTime sentAt
) {}
