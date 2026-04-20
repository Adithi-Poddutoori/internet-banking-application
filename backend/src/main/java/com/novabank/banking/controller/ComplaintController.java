package com.novabank.banking.controller;

import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.dto.complaint.ComplaintRequest;
import com.novabank.banking.dto.complaint.ComplaintResponse;
import com.novabank.banking.dto.complaint.ComplaintStatusUpdateRequest;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.ComplaintService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/complaints")
@RequiredArgsConstructor
@Tag(name = "Complaints")
public class ComplaintController {

    private final ComplaintService complaintService;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<ComplaintResponse>> create(@RequestBody ComplaintRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Complaint submitted successfully",
                complaintService.createComplaint(securityUtils.currentUsername(), request)
        ));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<ComplaintResponse>>> myComplaints() {
        return ResponseEntity.ok(new ApiResponse<>(
                "Complaints loaded",
                complaintService.getMyComplaints(securityUtils.currentUsername())
        ));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<ComplaintResponse>>> allComplaints() {
        return ResponseEntity.ok(new ApiResponse<>(
                "All complaints loaded",
                complaintService.getAllComplaints()
        ));
    }

    @PutMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ComplaintResponse>> updateStatus(
            @PathVariable Long id,
            @RequestBody ComplaintStatusUpdateRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Complaint status updated",
                complaintService.updateComplaintStatus(id, request)
        ));
    }
}
