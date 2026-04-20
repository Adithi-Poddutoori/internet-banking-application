package com.novabank.banking.dto.product;

public record ProductDecisionRequest(
        String decision,   // APPROVED or DECLINED
        String adminNote
) {}
