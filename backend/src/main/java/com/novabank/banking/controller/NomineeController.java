package com.novabank.banking.controller;

import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.dto.nominee.NomineeRequest;
import com.novabank.banking.dto.nominee.NomineeResponse;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.NomineeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@RestController
@RequestMapping("/api/v1/nominees")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
@Tag(name = "Nominees")
public class NomineeController {

    private final NomineeService nomineeService;
    private final SecurityUtils securityUtils;

    @GetMapping
    @Operation(summary = "List nominees for a given customer account")
    public ResponseEntity<ApiResponse<Set<NomineeResponse>>> list(@RequestParam String accountNumber) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Nominees loaded",
                nomineeService.listMyNominees(accountNumber, securityUtils.currentUsername())
        ));
    }

    @PostMapping
    @Operation(summary = "Add nominee to a customer account")
    public ResponseEntity<ApiResponse<NomineeResponse>> add(
            @RequestParam String accountNumber,
            @Valid @RequestBody NomineeRequest request
    ) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Nominee added successfully",
                nomineeService.addNominee(accountNumber, request, securityUtils.currentUsername())
        ));
    }

    @PutMapping("/{nomineeId}")
    @Operation(summary = "Update a nominee")
    public ResponseEntity<ApiResponse<NomineeResponse>> update(
            @PathVariable Long nomineeId,
            @Valid @RequestBody NomineeRequest request
    ) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Nominee updated successfully",
                nomineeService.updateNominee(nomineeId, request, securityUtils.currentUsername())
        ));
    }

    @DeleteMapping("/{nomineeId}")
    @Operation(summary = "Delete a nominee")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long nomineeId) {
        nomineeService.deleteNominee(nomineeId, securityUtils.currentUsername());
        return ResponseEntity.ok(new ApiResponse<>("Nominee deleted successfully", null));
    }
}
