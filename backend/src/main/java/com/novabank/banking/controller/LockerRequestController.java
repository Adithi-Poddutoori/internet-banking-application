package com.novabank.banking.controller;

import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.dto.locker.LockerAssignRequest;
import com.novabank.banking.dto.locker.LockerRequestRequest;
import com.novabank.banking.dto.locker.LockerRequestResponse;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.LockerRequestService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/locker-requests")
@RequiredArgsConstructor
@Tag(name = "Locker Requests")
public class LockerRequestController {

    private final LockerRequestService lockerService;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<LockerRequestResponse>> submit(@RequestBody LockerRequestRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Locker request submitted",
                lockerService.submit(securityUtils.currentUsername(), request)
        ));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<LockerRequestResponse>>> mine() {
        return ResponseEntity.ok(new ApiResponse<>(
                "Locker requests loaded",
                lockerService.getMine(securityUtils.currentUsername())
        ));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<LockerRequestResponse>>> all() {
        return ResponseEntity.ok(new ApiResponse<>(
                "All locker requests loaded",
                lockerService.getAll()
        ));
    }

    @PutMapping("/admin/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<LockerRequestResponse>> assign(
            @PathVariable Long id,
            @RequestBody LockerAssignRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Locker assigned",
                lockerService.assign(id, request)
        ));
    }

    @PutMapping("/admin/{id}/decline")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<LockerRequestResponse>> decline(@PathVariable Long id) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Locker request declined",
                lockerService.decline(id)
        ));
    }
}
