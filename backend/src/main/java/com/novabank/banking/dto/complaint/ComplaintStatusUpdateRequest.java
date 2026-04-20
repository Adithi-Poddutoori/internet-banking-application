package com.novabank.banking.dto.complaint;

public record ComplaintStatusUpdateRequest(
        String status,
        String adminNote
) {}
