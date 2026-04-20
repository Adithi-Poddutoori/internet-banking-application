package com.novabank.banking.controller;

import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.dto.expense.ExpenseRequest;
import com.novabank.banking.dto.expense.ExpenseResponse;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.ExpenseService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/expenses")
@RequiredArgsConstructor
@Tag(name = "Expenses")
public class ExpenseController {

    private final ExpenseService service;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<ExpenseResponse>> add(@RequestBody ExpenseRequest request) {
        return ResponseEntity.ok(new ApiResponse<>("Expense added", service.add(securityUtils.currentUsername(), request)));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<ExpenseResponse>>> mine() {
        return ResponseEntity.ok(new ApiResponse<>("Expenses loaded", service.getMine(securityUtils.currentUsername())));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.delete(id, securityUtils.currentUsername());
        return ResponseEntity.ok(new ApiResponse<>("Expense deleted", null));
    }

    @GetMapping("/my/imported-ids")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Set<String>>> importedIds() {
        return ResponseEntity.ok(new ApiResponse<>("Imported IDs loaded", service.getImportedIds(securityUtils.currentUsername())));
    }
}
