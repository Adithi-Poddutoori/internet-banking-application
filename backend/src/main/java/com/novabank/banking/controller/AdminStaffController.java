package com.novabank.banking.controller;

import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.dto.staff.StaffLogResponse;
import com.novabank.banking.dto.staff.StaffRequest;
import com.novabank.banking.dto.staff.StaffResponse;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.AdminStaffService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/staff")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Staff Management")
public class AdminStaffController {

    private final AdminStaffService service;
    private final SecurityUtils securityUtils;

    @GetMapping
    @Operation(summary = "List all admin staff members")
    public ResponseEntity<ApiResponse<List<StaffResponse>>> list() {
        return ResponseEntity.ok(new ApiResponse<>("Staff list loaded", service.listAll()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Find admin staff member by ID")
    public ResponseEntity<ApiResponse<StaffResponse>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(new ApiResponse<>("Staff member loaded", service.findById(id)));
    }

    @PostMapping
    @Operation(summary = "Create a new admin/employee account")
    public ResponseEntity<ApiResponse<StaffResponse>> create(@Valid @RequestBody StaffRequest request) {
        return ResponseEntity.ok(new ApiResponse<>("Staff member created", service.create(request, securityUtils.currentUsername())));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing admin/employee")
    public ResponseEntity<ApiResponse<StaffResponse>> update(@PathVariable Long id, @Valid @RequestBody StaffRequest request) {
        return ResponseEntity.ok(new ApiResponse<>("Staff member updated", service.update(id, request, securityUtils.currentUsername())));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an admin/employee account")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.delete(id, securityUtils.currentUsername());
        return ResponseEntity.ok(new ApiResponse<>("Staff member deleted", null));
    }

    @GetMapping("/logs")
    @Operation(summary = "Get admin staff change history")
    public ResponseEntity<ApiResponse<List<StaffLogResponse>>> logs() {
        return ResponseEntity.ok(new ApiResponse<>("Staff logs loaded", service.getLogs()));
    }
}
