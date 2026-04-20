package com.novabank.banking.controller;

import com.novabank.banking.dto.cheque.StoppedChequeDecision;
import com.novabank.banking.dto.cheque.StoppedChequeRequest;
import com.novabank.banking.dto.cheque.StoppedChequeResponse;
import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.StoppedChequeService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/stopped-cheques")
@RequiredArgsConstructor
@Tag(name = "Stopped Cheques")
public class StoppedChequeController {

    private final StoppedChequeService chequeService;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<StoppedChequeResponse>> stop(@RequestBody StoppedChequeRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Cheque stop request submitted successfully",
                chequeService.stopCheque(securityUtils.currentUsername(), request)
        ));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<StoppedChequeResponse>>> myCheques() {
        return ResponseEntity.ok(new ApiResponse<>(
                "Stopped cheques loaded",
                chequeService.getMyCheques(securityUtils.currentUsername())
        ));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<StoppedChequeResponse>>> allCheques() {
        return ResponseEntity.ok(new ApiResponse<>(
                "All stopped cheques loaded",
                chequeService.getAllCheques()
        ));
    }

    @PutMapping("/admin/{id}/decide")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<StoppedChequeResponse>> decide(
            @PathVariable Long id,
            @RequestBody StoppedChequeDecision request) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Decision recorded",
                chequeService.decide(id, request.action(), request.adminNote())
        ));
    }
}
