package com.novabank.banking.service.impl;

import com.novabank.banking.dto.nominee.NomineeRequest;
import com.novabank.banking.dto.nominee.NomineeResponse;
import com.novabank.banking.entity.BankAccount;
import com.novabank.banking.entity.Nominee;
import com.novabank.banking.exception.BusinessException;
import com.novabank.banking.exception.ResourceNotFoundException;
import com.novabank.banking.mapper.BankingMapper;
import com.novabank.banking.repository.AccountRepository;
import com.novabank.banking.repository.NomineeRepository;
import com.novabank.banking.service.NomineeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NomineeServiceImpl implements NomineeService {

    private final AccountRepository accountRepository;
    private final NomineeRepository nomineeRepository;

    @Override
    @Transactional(readOnly = true)
    public Set<NomineeResponse> listMyNominees(String accountNumber, String username) {
        BankAccount account = getOwnedAccount(accountNumber, username);
        return account.getNominees().stream()
                .sorted(Comparator.comparing(Nominee::getId).reversed())
                .map(BankingMapper::toNomineeResponse)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    @Override
    @Transactional
    public NomineeResponse addNominee(String accountNumber, NomineeRequest request, String username) {
        BankAccount account = getOwnedAccount(accountNumber, username);
        Nominee nominee = Nominee.builder()
                .name(request.name())
                .govtId(request.govtId())
                .govtIdType(request.govtIdType())
                .phoneNo(request.phoneNo())
                .relation(request.relation())
                .bankAccount(account)
                .build();
        return BankingMapper.toNomineeResponse(nomineeRepository.save(nominee));
    }

    @Override
    @Transactional
    public NomineeResponse updateNominee(Long nomineeId, NomineeRequest request, String username) {
        Nominee nominee = nomineeRepository.findById(nomineeId)
                .orElseThrow(() -> new ResourceNotFoundException("Nominee not found"));
        validateOwnership(nominee.getBankAccount(), username);

        nominee.setName(request.name());
        nominee.setGovtId(request.govtId());
        nominee.setGovtIdType(request.govtIdType());
        nominee.setPhoneNo(request.phoneNo());
        nominee.setRelation(request.relation());
        return BankingMapper.toNomineeResponse(nominee);
    }

    @Override
    @Transactional
    public void deleteNominee(Long nomineeId, String username) {
        Nominee nominee = nomineeRepository.findById(nomineeId)
                .orElseThrow(() -> new ResourceNotFoundException("Nominee not found"));
        validateOwnership(nominee.getBankAccount(), username);
        nomineeRepository.delete(nominee);
    }

    private BankAccount getOwnedAccount(String accountNumber, String username) {
        BankAccount account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        validateOwnership(account, username);
        return account;
    }

    private void validateOwnership(BankAccount account, String username) {
        if (!account.getCustomer().getUser().getUsername().equals(username)) {
            throw new BusinessException("You can only manage nominees for your own account");
        }
    }
}
