package com.novabank.banking.controller;

import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.dto.transaction.TransactionResponse;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
@Tag(name = "Transactions")
public class TransactionController {

    private final TransactionService transactionService;
    private final SecurityUtils securityUtils;

    @GetMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "List transactions for one account or all customer accounts")
    public ResponseEntity<ApiResponse<List<TransactionResponse>>> myTransactions(
            @RequestParam(required = false) String accountNumber,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to
    ) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Transactions loaded",
                transactionService.getMyTransactions(accountNumber, from, to, securityUtils.currentUsername())
        ));
    }

    @GetMapping("/{transactionId}")
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN')")
    @Operation(summary = "Get a transaction by ID")
    public ResponseEntity<ApiResponse<TransactionResponse>> transactionById(
            @PathVariable Long transactionId,
            Authentication authentication
    ) {
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
        return ResponseEntity.ok(new ApiResponse<>(
                "Transaction loaded",
                transactionService.findTransactionById(transactionId, securityUtils.currentUsername(), isAdmin)
        ));
    }
}
