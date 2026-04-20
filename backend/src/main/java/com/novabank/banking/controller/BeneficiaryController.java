package com.novabank.banking.controller;

import com.novabank.banking.dto.beneficiary.BeneficiaryRequest;
import com.novabank.banking.dto.beneficiary.BeneficiaryResponse;
import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.BeneficiaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@RestController
@RequestMapping("/api/v1/beneficiaries")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
@Tag(name = "Beneficiaries")
public class BeneficiaryController {

    private final BeneficiaryService beneficiaryService;
    private final SecurityUtils securityUtils;

    @GetMapping
    @Operation(summary = "List beneficiaries for a given customer account")
    public ResponseEntity<ApiResponse<Set<BeneficiaryResponse>>> list(@RequestParam String accountNumber) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Beneficiaries loaded",
                beneficiaryService.listMyBeneficiaries(accountNumber, securityUtils.currentUsername())
        ));
    }

    @PostMapping
    @Operation(summary = "Add beneficiary to a customer account")
    public ResponseEntity<ApiResponse<BeneficiaryResponse>> add(
            @RequestParam String accountNumber,
            @Valid @RequestBody BeneficiaryRequest request
    ) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Beneficiary added successfully",
                beneficiaryService.addBeneficiary(accountNumber, request, securityUtils.currentUsername())
        ));
    }

    @PutMapping("/{beneficiaryId}")
    @Operation(summary = "Update an existing beneficiary")
    public ResponseEntity<ApiResponse<BeneficiaryResponse>> update(
            @PathVariable Long beneficiaryId,
            @Valid @RequestBody BeneficiaryRequest request
    ) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Beneficiary updated successfully",
                beneficiaryService.updateBeneficiary(beneficiaryId, request, securityUtils.currentUsername())
        ));
    }

    @DeleteMapping("/{beneficiaryId}")
    @Operation(summary = "Delete a beneficiary")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long beneficiaryId) {
        beneficiaryService.deleteBeneficiary(beneficiaryId, securityUtils.currentUsername());
        return ResponseEntity.ok(new ApiResponse<>("Beneficiary deleted successfully", null));
    }
}
