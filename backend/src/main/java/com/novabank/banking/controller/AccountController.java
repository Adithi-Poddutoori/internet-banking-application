package com.novabank.banking.controller;

import com.novabank.banking.dto.account.AccountResponse;
import com.novabank.banking.dto.account.DepositRequest;
import com.novabank.banking.dto.account.TransferRequest;
import com.novabank.banking.dto.account.WithdrawalRequest;
import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.dto.transaction.TransactionResponse;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
@Tag(name = "Accounts")
public class AccountController {

    private final AccountService accountService;
    private final SecurityUtils securityUtils;

    @GetMapping
    @Operation(summary = "List all accounts for the logged-in customer")
    public ResponseEntity<ApiResponse<List<AccountResponse>>> myAccounts() {
        return ResponseEntity.ok(new ApiResponse<>(
                "Accounts loaded",
                accountService.getMyAccounts(securityUtils.currentUsername())
        ));
    }

    @GetMapping("/{accountNumber}")
    @Operation(summary = "Get account details by account number")
    public ResponseEntity<ApiResponse<AccountResponse>> accountByNumber(@PathVariable String accountNumber) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Account loaded",
                accountService.findAccountByNumber(accountNumber, securityUtils.currentUsername())
        ));
    }

    @GetMapping("/lookup/{accountNumber}")
    @Operation(summary = "Check if an account exists and is active in Nova Bank (no ownership required)")
    public ResponseEntity<ApiResponse<AccountResponse>> lookupAccount(@PathVariable String accountNumber) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Account found",
                accountService.lookupAccount(accountNumber)
        ));
    }

    @PostMapping("/{accountNumber}/deposit")
    @Operation(summary = "Deposit funds into an active savings account")
    public ResponseEntity<ApiResponse<TransactionResponse>> deposit(
            @PathVariable String accountNumber,
            @Valid @RequestBody DepositRequest request
    ) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Deposit completed successfully",
                accountService.deposit(accountNumber, request, securityUtils.currentUsername())
        ));
    }

    @PostMapping("/{accountNumber}/withdraw")
    @Operation(summary = "Withdraw funds from an active savings account")
    public ResponseEntity<ApiResponse<TransactionResponse>> withdraw(
            @PathVariable String accountNumber,
            @Valid @RequestBody WithdrawalRequest request
    ) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Withdrawal completed successfully",
                accountService.withdraw(accountNumber, request, securityUtils.currentUsername())
        ));
    }

    @PostMapping("/transfer")
    @Operation(summary = "Transfer money from one customer account to another account")
    public ResponseEntity<ApiResponse<TransactionResponse>> transfer(@Valid @RequestBody TransferRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Transfer completed successfully",
                accountService.transfer(request, securityUtils.currentUsername())
        ));
    }

    @PostMapping("/{accountNumber}/close")
    @Operation(summary = "Close a customer account when its balance is zero")
    public ResponseEntity<ApiResponse<AccountResponse>> closeAccount(@PathVariable String accountNumber) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Account closed successfully",
                accountService.closeAccount(accountNumber, securityUtils.currentUsername())
        ));
    }
}
