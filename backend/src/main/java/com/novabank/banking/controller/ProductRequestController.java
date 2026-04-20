package com.novabank.banking.controller;

import com.novabank.banking.dto.common.ApiResponse;
import com.novabank.banking.dto.product.ProductDecisionRequest;
import com.novabank.banking.dto.product.ProductRequestResponse;
import com.novabank.banking.dto.product.ProductRequestSubmit;
import com.novabank.banking.security.SecurityUtils;
import com.novabank.banking.service.ProductRequestService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/product-requests")
@RequiredArgsConstructor
@Tag(name = "Product Requests")
public class ProductRequestController {

    private final ProductRequestService productRequestService;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<ProductRequestResponse>> submit(@RequestBody ProductRequestSubmit request) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Product request submitted",
                productRequestService.submit(securityUtils.currentUsername(), request)
        ));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<ProductRequestResponse>>> myRequests() {
        return ResponseEntity.ok(new ApiResponse<>(
                "My product requests loaded",
                productRequestService.getMyRequests(securityUtils.currentUsername())
        ));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<ProductRequestResponse>>> allRequests() {
        return ResponseEntity.ok(new ApiResponse<>(
                "All product requests loaded",
                productRequestService.getAllRequests()
        ));
    }

    @PutMapping("/admin/{id}/decide")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ProductRequestResponse>> decide(
            @PathVariable Long id,
            @RequestBody ProductDecisionRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Product request decision saved",
                productRequestService.decide(id, request)
        ));
    }

    /**
     * Admin: block or unblock an approved product for a customer.
     * PUT /api/v1/product-requests/admin/block
     * Body: { "customerUsername": "...", "category": "loans", "productTitle": "Home Loan", "blocked": true }
     */
    @PutMapping("/admin/block")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ProductRequestResponse>> setBlocked(
            @RequestBody BlockRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(
                "Product block state updated",
                productRequestService.setBlocked(
                        request.customerUsername(), request.category(),
                        request.productTitle(), request.blocked())
        ));
    }

    record BlockRequest(String customerUsername, String category, String productTitle, boolean blocked) {}
}
