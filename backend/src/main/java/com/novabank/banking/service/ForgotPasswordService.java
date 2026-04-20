package com.novabank.banking.service;

import com.novabank.banking.dto.auth.ForgotPasswordRequest;
import com.novabank.banking.dto.auth.ResetPasswordRequest;

public interface ForgotPasswordService {
    void sendOtp(ForgotPasswordRequest request);
    void verifyOtp(ResetPasswordRequest request);
    void resetPassword(ResetPasswordRequest request);
}
