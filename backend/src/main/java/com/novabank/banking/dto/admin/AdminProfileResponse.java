package com.novabank.banking.dto.admin;

public record AdminProfileResponse(
        Long id,
        String adminName,
        String adminEmailId,
        String adminContact,
        String username,
        String role
) {
}
