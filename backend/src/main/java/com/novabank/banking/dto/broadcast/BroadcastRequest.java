package com.novabank.banking.dto.broadcast;

public record BroadcastRequest(
        String title,
        String message,
        String type,
        String target,
        String accountNumber
) {}
