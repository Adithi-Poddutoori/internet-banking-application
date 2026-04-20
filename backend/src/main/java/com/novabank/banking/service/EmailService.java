package com.novabank.banking.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromAddress;

    public void sendPasswordResetOtp(String toEmail, String customerName, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject("Nova Bank – Password Reset OTP");
        message.setText(
            "Dear " + customerName + ",\n\n" +
            "You requested a password reset for your Nova Bank account.\n\n" +
            "Your One-Time Password (OTP) is:\n\n" +
            "  " + otp + "\n\n" +
            "This OTP is valid for 10 minutes and can be used only once.\n" +
            "If you did not request this, please ignore this email.\n\n" +
            "Regards,\n" +
            "Nova Bank Security Team"
        );
        mailSender.send(message);
    }
}
