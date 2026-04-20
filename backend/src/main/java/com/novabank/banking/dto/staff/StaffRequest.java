package com.novabank.banking.dto.staff;

import jakarta.validation.constraints.NotBlank;

public record StaffRequest(
        @NotBlank String adminName,
        @NotBlank String adminEmailId,
        @NotBlank String adminContact,
        @NotBlank String username,
        String password,    // required on create, optional on update
        String role         // "ADMIN" default; future-proofing for sub-roles
) {}
