package com.novabank.banking.controller;

import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.dto.reward.RedemptionRequest;
import com.novabank.banking.dto.reward.RedemptionResponse;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.RewardRedemptionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reward-redemptions")
@RequiredArgsConstructor
@Tag(name = "Reward Redemptions")
public class RewardRedemptionController {

    private final RewardRedemptionService service;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<RedemptionResponse>> redeem(@RequestBody RedemptionRequest request) {
        return ResponseEntity.ok(new ApiResponse<>("Redeemed successfully", service.redeem(securityUtils.currentUsername(), request)));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<RedemptionResponse>>> mine() {
        return ResponseEntity.ok(new ApiResponse<>("Redemptions loaded", service.getMine(securityUtils.currentUsername())));
    }

    @GetMapping("/my/total-points")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Integer>> totalPoints() {
        return ResponseEntity.ok(new ApiResponse<>("Total redeemed points", service.getTotalRedeemedPoints(securityUtils.currentUsername())));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<RedemptionResponse>>> all() {
        return ResponseEntity.ok(new ApiResponse<>("All redemptions loaded", service.getAll()));
    }
}
