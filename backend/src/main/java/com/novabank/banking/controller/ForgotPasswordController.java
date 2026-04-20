package com.novabank.banking.controller;

import com.novabank.banking.dto.auth.ForgotPasswordRequest;
import com.novabank.banking.dto.auth.ResetPasswordRequest;
import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.service.ForgotPasswordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Forgot Password")
public class ForgotPasswordController {

    private final ForgotPasswordService forgotPasswordService;

    @PostMapping("/forgot-password")
    @Operation(summary = "Send OTP to customer email for password reset (customers only)")
    public ResponseEntity<ApiResponse<String>> sendOtp(@RequestBody ForgotPasswordRequest request) {
        forgotPasswordService.sendOtp(request);
        return ResponseEntity.ok(new ApiResponse<>("OTP sent to your registered email address", null));
    }

    @PostMapping("/verify-otp")
    @Operation(summary = "Verify OTP validity without consuming it")
    public ResponseEntity<ApiResponse<String>> verifyOtp(@RequestBody ResetPasswordRequest request) {
        forgotPasswordService.verifyOtp(request);
        return ResponseEntity.ok(new ApiResponse<>("OTP is valid", null));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password using OTP received via email")
    public ResponseEntity<ApiResponse<String>> resetPassword(@RequestBody ResetPasswordRequest request) {
        forgotPasswordService.resetPassword(request);
        return ResponseEntity.ok(new ApiResponse<>("Password reset successfully. Please log in with your new password.", null));
    }
}
