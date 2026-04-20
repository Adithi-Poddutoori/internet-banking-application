package com.novabank.banking.controller;

import com.novabank.banking.dto.auth.AuthResponse;
import com.novabank.banking.dto.auth.CustomerRegistrationResponse;
import com.novabank.banking.dto.auth.LoginRequest;
import com.novabank.banking.dto.auth.RegisterCustomerRequest;
import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.service.CustomerService;
import com.novabank.banking.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication")
public class AuthController {

    private final UserService userService;
    private final CustomerService customerService;

    @PostMapping("/login")
    @Operation(summary = "Authenticate admin or customer and return a JWT")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(new ApiResponse<>("Login successful", userService.signIn(request)));
    }

    @PostMapping("/register/customer")
    @Operation(summary = "Register a customer and create a pending account creation request")
    public ResponseEntity<ApiResponse<CustomerRegistrationResponse>> registerCustomer(
            @Valid @RequestBody RegisterCustomerRequest request
    ) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Customer application submitted",
                customerService.registerCustomerApplication(request)
        ));
    }
}
