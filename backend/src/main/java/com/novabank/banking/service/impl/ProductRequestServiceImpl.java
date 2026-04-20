package com.novabank.banking.service.impl;

import com.novabank.banking.dto.account.OpenAccountRequest;
import com.novabank.banking.dto.product.ProductDecisionRequest;
import com.novabank.banking.dto.product.ProductRequestResponse;
import com.novabank.banking.dto.product.ProductRequestSubmit;
import com.novabank.banking.entity.Customer;
import com.novabank.banking.entity.ProductRequest;
import com.novabank.banking.enums.AccountType;
import com.novabank.banking.repository.CustomerRepository;
import com.novabank.banking.repository.ProductRequestRepository;
import com.novabank.banking.service.CustomerService;
import com.novabank.banking.service.ProductRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductRequestServiceImpl implements ProductRequestService {

    private final ProductRequestRepository productRequestRepository;
    private final CustomerRepository customerRepository;
    @Lazy
    private final CustomerService customerService;

    @Override
    public ProductRequestResponse submit(String username, ProductRequestSubmit request) {
        Customer customer = customerRepository.findByUserUsername(username)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        // Prevent duplicate pending requests for the same product
        boolean alreadyPending = productRequestRepository
                .existsByCustomerUsernameAndCategoryAndProductTitleAndStatus(
                        username, request.category(), request.productTitle(), "PENDING");
        if (alreadyPending) {
            // Return existing pending entry (idempotent)
            return productRequestRepository
                    .findByCustomerUsernameOrderByAppliedOnDesc(username)
                    .stream()
                    .filter(p -> p.getCategory().equals(request.category())
                            && p.getProductTitle().equals(request.productTitle())
                            && p.getStatus().equals("PENDING"))
                    .findFirst()
                    .map(this::toResponse)
                    .orElseThrow();
        }

        ProductRequest entity = ProductRequest.builder()
                .customerId(customer.getId())
                .customerUsername(username)
                .customerName(customer.getCustomerName())
                .category(request.category())
                .productTitle(request.productTitle())
                .status("PENDING")
                .formData(request.formData())
                .appliedOn(LocalDateTime.now())
                .build();

        return toResponse(productRequestRepository.save(entity));
    }

    @Override
    public List<ProductRequestResponse> getMyRequests(String username) {
        return productRequestRepository
                .findByCustomerUsernameOrderByAppliedOnDesc(username)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<ProductRequestResponse> getAllRequests() {
        return productRequestRepository
                .findAllByOrderByAppliedOnDesc()
                .stream().map(this::toResponse).toList();
    }

    @Override
    public ProductRequestResponse decide(Long id, ProductDecisionRequest request) {
        ProductRequest entity = productRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product request not found"));
        entity.setStatus(request.decision()); // APPROVED or DECLINED
        entity.setAdminNote(request.adminNote());
        entity.setDecidedOn(LocalDateTime.now());
        // Unblock when approved, keep blocked otherwise
        if ("APPROVED".equals(request.decision())) {
            entity.setBlocked(false);
        }
        ProductRequest saved = productRequestRepository.save(entity);

        // If an account opening request was approved, actually open the account
        if ("accounts".equals(entity.getCategory()) && "APPROVED".equals(request.decision())) {
            String[] parts = entity.getProductTitle().split(":");
            AccountType accountType = AccountType.valueOf(parts[0]);
            BigDecimal deposit = parts.length > 1
                    ? new BigDecimal(parts[1])
                    : switch (accountType) {
                        case STUDENT -> BigDecimal.ZERO;
                        case RURAL   -> new BigDecimal("500");
                        case TERM    -> new BigDecimal("5000");
                        default      -> new BigDecimal("1000");
                    };
            Integer termMonths = accountType == AccountType.TERM
                    ? (parts.length > 2 ? Integer.parseInt(parts[2]) : 12)
                    : null;
            customerService.openNewAccount(entity.getCustomerUsername(),
                    new OpenAccountRequest(accountType, deposit, termMonths));
        }

        return toResponse(saved);
    }

    @Override
    public ProductRequestResponse setBlocked(String customerUsername, String category,
                                              String productTitle, boolean blocked) {
        ProductRequest entity = productRequestRepository
                .findTopByCustomerUsernameAndCategoryAndProductTitleAndStatusOrderByDecidedOnDesc(
                        customerUsername, category, productTitle, "APPROVED")
                .orElseThrow(() -> new RuntimeException(
                        "No approved product request found for " + customerUsername + " / " + category + " / " + productTitle));
        entity.setBlocked(blocked);
        return toResponse(productRequestRepository.save(entity));
    }

    private ProductRequestResponse toResponse(ProductRequest p) {
        return new ProductRequestResponse(
                p.getId(),
                p.getCustomerUsername(),
                p.getCustomerName(),
                p.getCategory(),
                p.getProductTitle(),
                p.getStatus(),
                p.getAdminNote(),
                p.getAppliedOn(),
                p.getDecidedOn(),
                p.isBlocked(),
                p.getFormData()
        );
    }
}
