package com.novabank.banking.service;

import com.novabank.banking.dto.beneficiary.BeneficiaryRequest;
import com.novabank.banking.dto.beneficiary.BeneficiaryResponse;

import java.util.Set;

public interface BeneficiaryService {

    Set<BeneficiaryResponse> listMyBeneficiaries(String accountNumber, String username);

    BeneficiaryResponse addBeneficiary(String accountNumber, BeneficiaryRequest request, String username);

    BeneficiaryResponse updateBeneficiary(Long beneficiaryId, BeneficiaryRequest request, String username);

    void deleteBeneficiary(Long beneficiaryId, String username);
}
