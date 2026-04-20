package com.novabank.banking.controller;

import com.novabank.banking.dto.bill.BillRequest;
import com.novabank.banking.dto.bill.BillResponse;
import com.novabank.banking.dto.bill.PaymentRecordRequest;
import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.BillMandateService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/bill-mandates")
@RequiredArgsConstructor
@Tag(name = "Bill Mandates")
public class BillMandateController {

    private final BillMandateService service;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<BillResponse>> add(@RequestBody BillRequest request) {
        return ResponseEntity.ok(new ApiResponse<>("Bill added", service.add(securityUtils.currentUsername(), request)));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<BillResponse>>> mine() {
        return ResponseEntity.ok(new ApiResponse<>("Bills loaded", service.getMine(securityUtils.currentUsername())));
    }

    @PatchMapping("/{id}/autopay")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<BillResponse>> toggleAutopay(@PathVariable Long id) {
        return ResponseEntity.ok(new ApiResponse<>("Autopay toggled", service.toggleAutopay(id, securityUtils.currentUsername())));
    }

    @PostMapping("/{id}/pay")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<BillResponse>> recordPayment(@PathVariable Long id, @RequestBody PaymentRecordRequest request) {
        return ResponseEntity.ok(new ApiResponse<>("Payment recorded", service.recordPayment(id, securityUtils.currentUsername(), request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.delete(id, securityUtils.currentUsername());
        return ResponseEntity.ok(new ApiResponse<>("Bill deleted", null));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<BillResponse>>> all() {
        return ResponseEntity.ok(new ApiResponse<>("All bills loaded", service.getAll()));
    }
}
