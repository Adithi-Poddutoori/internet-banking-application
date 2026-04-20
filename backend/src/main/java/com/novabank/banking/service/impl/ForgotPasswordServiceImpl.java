package com.novabank.banking.service.impl;

import com.novabank.banking.dto.auth.ForgotPasswordRequest;
import com.novabank.banking.dto.auth.ResetPasswordRequest;
import com.novabank.banking.entity.BankUser;
import com.novabank.banking.entity.Customer;
import com.novabank.banking.entity.PasswordResetToken;
import com.novabank.banking.exception.BusinessException;
import com.novabank.banking.repository.CustomerRepository;
import com.novabank.banking.repository.PasswordResetTokenRepository;
import com.novabank.banking.repository.UserRepository;
import com.novabank.banking.service.EmailService;
import com.novabank.banking.service.ForgotPasswordService;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ForgotPasswordServiceImpl implements ForgotPasswordService {

    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    private static final SecureRandom RANDOM = new SecureRandom();

    @Override
    @Transactional
    public void sendOtp(ForgotPasswordRequest request) {
        String email = request.email();
        if (email == null || email.isBlank()) {
            throw new BusinessException("Email address is required");
        }

        // Only customers can reset password via email (not admins)
        Customer customer = customerRepository.findByEmailIdIgnoreCase(email.trim())
                .orElseThrow(() -> new BusinessException("No customer account found with this email address"));

        try {
            // Invalidate any existing OTPs for this email
            tokenRepository.deleteByEmail(customer.getEmailId());

            // Generate a 6-digit OTP using SecureRandom
            String otp = String.format("%06d", RANDOM.nextInt(1_000_000));

            PasswordResetToken token = PasswordResetToken.builder()
                    .otp(otp)
                    .email(customer.getEmailId())
                    .username(customer.getUser().getUsername())
                    .expiresAt(LocalDateTime.now().plusMinutes(10))
                    .used(false)
                    .build();
            tokenRepository.save(token);

            // Send OTP email
            emailService.sendPasswordResetOtp(customer.getEmailId(), customer.getCustomerName(), otp);
        } catch (BusinessException ex) {
            throw ex;
        } catch (MailException ex) {
            throw new BusinessException("Email delivery failed: " + ex.getMessage());
        } catch (Exception ex) {
            throw new BusinessException("OTP generation failed: " + ex.getClass().getSimpleName() + ": " + ex.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public void verifyOtp(ResetPasswordRequest request) {
        if (request.email() == null || request.otp() == null) {
            throw new BusinessException("Email and OTP are required");
        }
        String email = request.email().trim();
        PasswordResetToken token = tokenRepository
                .findTopByEmailIgnoreCaseAndUsedFalseOrderByExpiresAtDesc(email)
                .orElseThrow(() -> new BusinessException("No OTP found for this email. Please request a new one."));
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException("OTP has expired. Please request a new one.");
        }
        if (!token.getOtp().equals(request.otp().trim())) {
            throw new BusinessException("Invalid OTP. Please check and try again.");
        }
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (request.email() == null || request.otp() == null || request.newPassword() == null) {
            throw new BusinessException("Email, OTP, and new password are all required");
        }
        if (request.newPassword().length() < 6) {
            throw new BusinessException("Password must be at least 6 characters");
        }

        String email = request.email().trim();

        PasswordResetToken token = tokenRepository
                .findTopByEmailIgnoreCaseAndUsedFalseOrderByExpiresAtDesc(email)
                .orElseThrow(() -> new BusinessException("No OTP found for this email. Please request a new one."));

        if (token.isUsed()) {
            throw new BusinessException("This OTP has already been used. Please request a new one.");
        }
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException("OTP has expired. Please request a new one.");
        }
        if (!token.getOtp().equals(request.otp().trim())) {
            throw new BusinessException("Invalid OTP. Please check and try again.");
        }

        // Update password
        BankUser user = userRepository.findByUsername(token.getUsername())
                .orElseThrow(() -> new BusinessException("User account not found"));
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        // Mark token as used
        token.setUsed(true);
        tokenRepository.save(token);
    }
}
