package com.novabank.banking.controller;

import com.novabank.banking.dto.claim.InsuranceClaimRequest;
import com.novabank.banking.dto.claim.InsuranceClaimResponse;
import com.novabank.banking.dto.claim.InsuranceClaimStatusUpdateRequest;
import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.InsuranceClaimService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/insurance-claims")
@RequiredArgsConstructor
@Tag(name = "Insurance Claims")
public class InsuranceClaimController {

    private final InsuranceClaimService claimService;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<InsuranceClaimResponse>> submit(@RequestBody InsuranceClaimRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Claim submitted successfully",
                claimService.submitClaim(securityUtils.currentUsername(), request)
        ));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<InsuranceClaimResponse>>> myClaims() {
        return ResponseEntity.ok(new ApiResponse<>(
                "Claims loaded",
                claimService.getMyClaims(securityUtils.currentUsername())
        ));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<InsuranceClaimResponse>>> allClaims() {
        return ResponseEntity.ok(new ApiResponse<>(
                "All claims loaded",
                claimService.getAllClaims()
        ));
    }

    @PutMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<InsuranceClaimResponse>> updateStatus(
            @PathVariable Long id,
            @RequestBody InsuranceClaimStatusUpdateRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Claim status updated",
                claimService.updateStatus(id, request)
        ));
    }
}
