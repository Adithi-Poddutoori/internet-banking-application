package com.novabank.banking.dto.auth;

import com.novabank.banking.enums.Role;

public record AuthResponse(
        String accessToken,
        String tokenType,
        String username,
        Role role,
        String displayName,
        String primaryAccountNumber
) {
}
