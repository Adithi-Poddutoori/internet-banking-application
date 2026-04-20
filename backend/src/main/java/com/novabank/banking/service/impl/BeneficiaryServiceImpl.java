package com.novabank.banking.service.impl;

import com.novabank.banking.dto.beneficiary.BeneficiaryRequest;
import com.novabank.banking.dto.beneficiary.BeneficiaryResponse;
import com.novabank.banking.entity.BankAccount;
import com.novabank.banking.entity.Beneficiary;
import com.novabank.banking.exception.BusinessException;
import com.novabank.banking.exception.ResourceNotFoundException;
import com.novabank.banking.mapper.BankingMapper;
import com.novabank.banking.repository.AccountRepository;
import com.novabank.banking.repository.BeneficiaryRepository;
import com.novabank.banking.service.BeneficiaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BeneficiaryServiceImpl implements BeneficiaryService {

    private final AccountRepository accountRepository;
    private final BeneficiaryRepository beneficiaryRepository;

    @Override
    @Transactional(readOnly = true)
    public Set<BeneficiaryResponse> listMyBeneficiaries(String accountNumber, String username) {
        BankAccount account = getOwnedAccount(accountNumber, username);
        return account.getBeneficiaries().stream()
                .sorted(Comparator.comparing(Beneficiary::getId).reversed())
                .map(BankingMapper::toBeneficiaryResponse)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    @Override
    @Transactional
    public BeneficiaryResponse addBeneficiary(String accountNumber, BeneficiaryRequest request, String username) {
        BankAccount account = getOwnedAccount(accountNumber, username);
        if (account.getAccountNumber().equals(request.beneficiaryAccountNo())) {
            throw new BusinessException("You cannot add your own account as beneficiary");
        }
        boolean duplicate = account.getBeneficiaries().stream()
                .anyMatch(existing -> existing.getBeneficiaryAccountNo().equals(request.beneficiaryAccountNo()));
        if (duplicate) {
            throw new BusinessException("Beneficiary is already added for this account");
        }

        Beneficiary beneficiary = Beneficiary.builder()
                .beneficiaryName(request.beneficiaryName())
                .beneficiaryAccountNo(request.beneficiaryAccountNo())
                .ifsc(request.ifsc())
                .bankName(request.bankName())
                .accountType(request.accountType())
                .bankAccount(account)
                .build();
        return BankingMapper.toBeneficiaryResponse(beneficiaryRepository.save(beneficiary));
    }

    @Override
    @Transactional
    public BeneficiaryResponse updateBeneficiary(Long beneficiaryId, BeneficiaryRequest request, String username) {
        Beneficiary beneficiary = beneficiaryRepository.findById(beneficiaryId)
                .orElseThrow(() -> new ResourceNotFoundException("Beneficiary not found"));
        validateOwnership(beneficiary.getBankAccount(), username);

        beneficiary.setBeneficiaryName(request.beneficiaryName());
        beneficiary.setBeneficiaryAccountNo(request.beneficiaryAccountNo());
        beneficiary.setIfsc(request.ifsc());
        beneficiary.setBankName(request.bankName());
        beneficiary.setAccountType(request.accountType());

        return BankingMapper.toBeneficiaryResponse(beneficiary);
    }

    @Override
    @Transactional
    public void deleteBeneficiary(Long beneficiaryId, String username) {
        Beneficiary beneficiary = beneficiaryRepository.findById(beneficiaryId)
                .orElseThrow(() -> new ResourceNotFoundException("Beneficiary not found"));
        validateOwnership(beneficiary.getBankAccount(), username);
        beneficiaryRepository.delete(beneficiary);
    }

    private BankAccount getOwnedAccount(String accountNumber, String username) {
        BankAccount account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        validateOwnership(account, username);
        return account;
    }

    private void validateOwnership(BankAccount account, String username) {
        if (!account.getCustomer().getUser().getUsername().equals(username)) {
            throw new BusinessException("You can only manage beneficiaries for your own account");
        }
    }
}
