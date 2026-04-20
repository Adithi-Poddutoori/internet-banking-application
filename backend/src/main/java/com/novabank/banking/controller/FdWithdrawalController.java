package com.novabank.banking.controller;

import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.dto.withdrawal.FdWithdrawalRequest;
import com.novabank.banking.dto.withdrawal.FdWithdrawalResponse;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.FdWithdrawalService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/fd-withdrawals")
@RequiredArgsConstructor
@Tag(name = "FD Withdrawals")
public class FdWithdrawalController {

    private final FdWithdrawalService service;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<FdWithdrawalResponse>> submit(@RequestBody FdWithdrawalRequest request) {
        return ResponseEntity.ok(new ApiResponse<>("Withdrawal submitted", service.submit(securityUtils.currentUsername(), request)));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<FdWithdrawalResponse>>> mine() {
        return ResponseEntity.ok(new ApiResponse<>("Withdrawals loaded", service.getMine(securityUtils.currentUsername())));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<FdWithdrawalResponse>>> all() {
        return ResponseEntity.ok(new ApiResponse<>("All withdrawals loaded", service.getAll()));
    }

    @PutMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<FdWithdrawalResponse>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(new ApiResponse<>("Status updated", service.updateStatus(id, body.get("status"))));
    }
}
