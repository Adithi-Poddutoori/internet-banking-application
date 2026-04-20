package com.novabank.banking.dto.auth;

import com.novabank.banking.enums.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LoginRequest(
        @NotBlank(message = "Username is required")
        String username,

        @NotBlank(message = "Password is required")
        String password,

        @NotNull(message = "Role is required")
        Role role
) {
}
