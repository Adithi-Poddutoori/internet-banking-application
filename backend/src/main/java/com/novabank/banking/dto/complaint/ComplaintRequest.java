package com.novabank.banking.dto.complaint;


public record ComplaintRequest(
        String subject,
        String description,
        String priority
) {}
