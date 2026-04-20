package com.novabank.banking.service.impl;

import com.novabank.banking.dto.claim.InsuranceClaimRequest;
import com.novabank.banking.dto.claim.InsuranceClaimResponse;
import com.novabank.banking.dto.claim.InsuranceClaimStatusUpdateRequest;
import com.novabank.banking.entity.Customer;
import com.novabank.banking.entity.InsuranceClaim;
import com.novabank.banking.enums.ClaimStatus;
import com.novabank.banking.repository.CustomerRepository;
import com.novabank.banking.repository.InsuranceClaimRepository;
import com.novabank.banking.service.InsuranceClaimService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InsuranceClaimServiceImpl implements InsuranceClaimService {

    private final InsuranceClaimRepository claimRepository;
    private final CustomerRepository customerRepository;

    @Override
    public InsuranceClaimResponse submitClaim(String username, InsuranceClaimRequest request) {
        Customer customer = customerRepository.findByUserUsername(username)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        String ref = "CLM-" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();

        InsuranceClaim claim = InsuranceClaim.builder()
                .ref(ref)
                .customerId(customer.getId())
                .customerUsername(username)
                .customerName(customer.getCustomerName())
                .policy(request.policy())
                .type(request.type())
                .amount(request.amount() != null ? request.amount() : BigDecimal.ZERO)
                .incidentDate(request.incidentDate() != null ? LocalDate.parse(request.incidentDate()) : LocalDate.now())
                .description(request.description())
                .status(ClaimStatus.PENDING)
                .submittedAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return toResponse(claimRepository.save(claim));
    }

    @Override
    public List<InsuranceClaimResponse> getMyClaims(String username) {
        return claimRepository.findByCustomerUsernameOrderBySubmittedAtDesc(username)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<InsuranceClaimResponse> getAllClaims() {
        return claimRepository.findAllByOrderBySubmittedAtDesc()
                .stream().map(this::toResponse).toList();
    }

    @Override
    public InsuranceClaimResponse updateStatus(Long id, InsuranceClaimStatusUpdateRequest request) {
        InsuranceClaim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found"));
        claim.setStatus(ClaimStatus.valueOf(request.status()));
        claim.setUpdatedAt(LocalDateTime.now());
        return toResponse(claimRepository.save(claim));
    }

    private InsuranceClaimResponse toResponse(InsuranceClaim c) {
        return new InsuranceClaimResponse(
                c.getId(), c.getRef(), c.getCustomerUsername(), c.getCustomerName(),
                c.getPolicy(), c.getType(), c.getAmount(), c.getIncidentDate(),
                c.getDescription(), c.getStatus().name(), c.getSubmittedAt(), c.getUpdatedAt()
        );
    }
}
