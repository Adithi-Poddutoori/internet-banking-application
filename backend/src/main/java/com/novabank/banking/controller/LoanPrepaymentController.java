package com.novabank.banking.controller;

import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.dto.prepayment.LoanPrepaymentRequest;
import com.novabank.banking.dto.prepayment.LoanPrepaymentResponse;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.LoanPrepaymentService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/loan-prepayments")
@RequiredArgsConstructor
@Tag(name = "Loan Prepayments")
public class LoanPrepaymentController {

    private final LoanPrepaymentService service;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<LoanPrepaymentResponse>> submit(@RequestBody LoanPrepaymentRequest request) {
        return ResponseEntity.ok(new ApiResponse<>("Prepayment submitted", service.submit(securityUtils.currentUsername(), request)));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<LoanPrepaymentResponse>>> mine() {
        return ResponseEntity.ok(new ApiResponse<>("Prepayments loaded", service.getMine(securityUtils.currentUsername())));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<LoanPrepaymentResponse>>> all() {
        return ResponseEntity.ok(new ApiResponse<>("All prepayments loaded", service.getAll()));
    }

    @PutMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<LoanPrepaymentResponse>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(new ApiResponse<>("Status updated", service.updateStatus(id, body.get("status"))));
    }
}
