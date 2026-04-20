package com.novabank.banking.dto.cheque;

public record StoppedChequeDecision(
        String action,   // "approve" | "decline"
        String adminNote
) {}
