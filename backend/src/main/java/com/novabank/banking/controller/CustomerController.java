package com.novabank.banking.controller;

import com.novabank.banking.dto.account.AccountResponse;
import com.novabank.banking.dto.account.OpenAccountRequest;
import com.novabank.banking.dto.auth.ChangePasswordRequest;
import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.dto.customer.CustomerDashboardResponse;
import com.novabank.banking.dto.customer.CustomerProfileResponse;
import com.novabank.banking.dto.customer.CustomerResponse;
import com.novabank.banking.dto.customer.UpdateCustomerRequest;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.CustomerService;
import com.novabank.banking.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
@Tag(name = "Customer")
public class CustomerController {

    private final CustomerService customerService;
    private final UserService userService;
    private final SecurityUtils securityUtils;

    @GetMapping("/me")
    @Operation(summary = "Get logged-in customer profile")
    public ResponseEntity<ApiResponse<CustomerResponse>> myProfile() {
        return ResponseEntity.ok(new ApiResponse<>(
                "Customer profile loaded",
                customerService.getProfile(securityUtils.currentUsername())
        ));
    }

    @GetMapping("/me/profile")
    @Operation(summary = "Get full customer profile with address and government ID")
    public ResponseEntity<ApiResponse<CustomerProfileResponse>> fullProfile() {
        return ResponseEntity.ok(new ApiResponse<>(
                "Customer full profile loaded",
                customerService.getFullProfile(securityUtils.currentUsername())
        ));
    }

    @PutMapping("/me")
    @Operation(summary = "Update logged-in customer profile")
    public ResponseEntity<ApiResponse<CustomerResponse>> updateProfile(@Valid @RequestBody UpdateCustomerRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Customer profile updated",
                customerService.updateProfile(securityUtils.currentUsername(), request)
        ));
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Get customer dashboard summary")
    public ResponseEntity<ApiResponse<CustomerDashboardResponse>> dashboard() {
        return ResponseEntity.ok(new ApiResponse<>(
                "Customer dashboard loaded",
                customerService.getDashboard(securityUtils.currentUsername())
        ));
    }

    @PutMapping("/me/password")
    @Operation(summary = "Change the logged-in customer password")
    public ResponseEntity<ApiResponse<Void>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(securityUtils.currentUsername(), request);
        return ResponseEntity.ok(new ApiResponse<>("Password changed successfully", null));
    }

    @PostMapping("/me/accounts")
    @Operation(summary = "Open a new bank account for the logged-in customer")
    public ResponseEntity<ApiResponse<AccountResponse>> openAccount(@Valid @RequestBody OpenAccountRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Account opened successfully",
                customerService.openNewAccount(securityUtils.currentUsername(), request)
        ));
    }
}
