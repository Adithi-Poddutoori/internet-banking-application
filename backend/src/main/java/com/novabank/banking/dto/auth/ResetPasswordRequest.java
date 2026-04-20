package com.novabank.banking.dto.auth;

public record ResetPasswordRequest(String email, String otp, String newPassword) {}
