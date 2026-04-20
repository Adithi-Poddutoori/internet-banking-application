package com.novabank.banking.service.impl;

import com.novabank.banking.dto.auth.AuthResponse;
import com.novabank.banking.dto.auth.ChangePasswordRequest;
import com.novabank.banking.dto.auth.LoginRequest;
import com.novabank.banking.entity.BankUser;
import com.novabank.banking.enums.Role;
import com.novabank.banking.exception.UnauthorizedException;
import com.novabank.banking.repository.AdminRepository;
import com.novabank.banking.repository.CustomerRepository;
import com.novabank.banking.security.JwtService;
import com.novabank.banking.service.UserService;
import com.novabank.banking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public AuthResponse signIn(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password())
            );
        } catch (DisabledException ex) {
            // Distinguish between declined application and admin-blocked account
            var cust = customerRepository.findByUserUsername(request.username()).orElse(null);
            if (cust != null && cust.getCustomerStatus() == com.novabank.banking.enums.CustomerStatus.DECLINED) {
                String reason = cust.getDeclineReason() != null ? cust.getDeclineReason() : "No reason provided";
                throw new UnauthorizedException("Your account application was declined. Reason: " + reason);
            }
            throw new UnauthorizedException("Your account has been blocked by the administrator. Please contact Nova Bank support.");
        } catch (AuthenticationException ex) {
            throw new UnauthorizedException("Invalid credentials or account is not active");
        }

        BankUser user = findByUsername(request.username());
        if (user.getRole() != request.role()) {
            throw new UnauthorizedException("Selected role does not match the user account");
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String token = jwtService.generateToken(userDetails, Map.of("role", user.getRole().name()));

        String displayName = user.getUsername();
        String primaryAccountNumber = null;
        if (user.getRole() == request.role() && request.role() == Role.CUSTOMER) {
            var customer = customerRepository.findByUserUsername(user.getUsername()).orElse(null);
            if (customer != null) {
                displayName = customer.getCustomerName();
                primaryAccountNumber = customer.getAccounts().stream()
                        .sorted(java.util.Comparator.comparing(a -> a.getId() != null ? a.getId() : 0L))
                        .findFirst()
                        .map(a -> a.getAccountNumber())
                        .orElse(null);
            }
        } else if (request.role() == Role.ADMIN) {
            var admin = adminRepository.findByUserUsername(user.getUsername()).orElse(null);
            if (admin != null) {
                displayName = admin.getAdminName();
            }
        }

        return new AuthResponse(token, "Bearer", user.getUsername(), user.getRole(), displayName, primaryAccountNumber);
    }

    @Override
    public void signOut(String username) {
        // Stateless JWT logout can be handled on the client side by discarding the token.
    }

    @Override
    @Transactional(readOnly = true)
    public BankUser findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }

    @Override
    @Transactional
    public void changePassword(String username, ChangePasswordRequest request) {
        BankUser user = findByUsername(username);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new UnauthorizedException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }
}
