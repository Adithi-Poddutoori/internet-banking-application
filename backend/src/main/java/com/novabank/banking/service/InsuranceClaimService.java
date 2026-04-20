package com.novabank.banking.service;

import com.novabank.banking.dto.claim.InsuranceClaimRequest;
import com.novabank.banking.dto.claim.InsuranceClaimResponse;
import com.novabank.banking.dto.claim.InsuranceClaimStatusUpdateRequest;

import java.util.List;

public interface InsuranceClaimService {
    InsuranceClaimResponse submitClaim(String username, InsuranceClaimRequest request);
    List<InsuranceClaimResponse> getMyClaims(String username);
    List<InsuranceClaimResponse> getAllClaims();
    InsuranceClaimResponse updateStatus(Long id, InsuranceClaimStatusUpdateRequest request);
}
