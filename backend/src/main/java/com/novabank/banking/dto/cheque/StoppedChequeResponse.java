package com.novabank.banking.dto.cheque;

import java.time.LocalDateTime;

public record StoppedChequeResponse(
        Long id,
        String chequeNo,
        String customerUsername,
        String customerName,
        String reason,
        LocalDateTime stoppedAt,
        String status,
        String adminNote,
        LocalDateTime decidedAt
) {}
