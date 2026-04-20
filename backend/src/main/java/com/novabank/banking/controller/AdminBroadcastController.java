package com.novabank.banking.controller;

import com.novabank.banking.dto.broadcast.BroadcastRequest;
import com.novabank.banking.dto.broadcast.BroadcastResponse;
import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.AdminBroadcastService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin-broadcasts")
@RequiredArgsConstructor
@Tag(name = "Admin Broadcasts")
public class AdminBroadcastController {

    private final AdminBroadcastService service;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<BroadcastResponse>> send(@RequestBody BroadcastRequest request) {
        return ResponseEntity.ok(new ApiResponse<>("Notification sent", service.send(securityUtils.currentUsername(), request)));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<BroadcastResponse>>> all() {
        return ResponseEntity.ok(new ApiResponse<>("Broadcasts loaded", service.getAll()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(new ApiResponse<>("Broadcast deleted", null));
    }

    @GetMapping("/for-account")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<BroadcastResponse>>> forAccount(@RequestParam String accountNumber) {
        return ResponseEntity.ok(new ApiResponse<>("Broadcasts loaded", service.getForAccount(accountNumber)));
    }
}
