package com.novabank.banking.dto.product;

public record ProductRequestSubmit(
        String category,
        String productTitle,
        String formData
) {}
