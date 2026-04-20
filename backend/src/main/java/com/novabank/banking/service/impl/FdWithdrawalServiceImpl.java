package com.novabank.banking.service.impl;

import com.novabank.banking.dto.withdrawal.FdWithdrawalRequest;
import com.novabank.banking.dto.withdrawal.FdWithdrawalResponse;
import com.novabank.banking.entity.Customer;
import com.novabank.banking.entity.FdWithdrawal;
import com.novabank.banking.enums.WithdrawalStatus;
import com.novabank.banking.repository.CustomerRepository;
import com.novabank.banking.repository.FdWithdrawalRepository;
import com.novabank.banking.service.FdWithdrawalService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FdWithdrawalServiceImpl implements FdWithdrawalService {

    private final FdWithdrawalRepository repo;
    private final CustomerRepository customerRepository;

    @Override
    public FdWithdrawalResponse submit(String username, FdWithdrawalRequest req) {
        Customer c = customerRepository.findByUserUsername(username)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        String ref = "WDL-" + System.currentTimeMillis() % 1_000_000;
        FdWithdrawal w = FdWithdrawal.builder()
                .customerId(c.getId())
                .customerUsername(username)
                .customerName(c.getCustomerName())
                .depositTitle(req.depositTitle())
                .depositRef(req.depositRef())
                .amount(req.amount())
                .accountNumber(req.accountNumber())
                .ref(ref)
                .status(WithdrawalStatus.PENDING)
                .withdrawnAt(LocalDateTime.now())
                .build();
        return toResponse(repo.save(w));
    }

    @Override
    public List<FdWithdrawalResponse> getMine(String username) {
        return repo.findByCustomerUsernameOrderByWithdrawnAtDesc(username)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<FdWithdrawalResponse> getAll() {
        return repo.findAllByOrderByWithdrawnAtDesc().stream().map(this::toResponse).toList();
    }

    @Override
    public FdWithdrawalResponse updateStatus(Long id, String status) {
        FdWithdrawal w = repo.findById(id).orElseThrow(() -> new RuntimeException("Withdrawal not found"));
        w.setStatus(WithdrawalStatus.valueOf(status.toUpperCase()));
        w.setDecidedAt(LocalDateTime.now());
        return toResponse(repo.save(w));
    }

    private FdWithdrawalResponse toResponse(FdWithdrawal w) {
        return new FdWithdrawalResponse(
                w.getId(), w.getCustomerUsername(), w.getCustomerName(),
                w.getDepositTitle(), w.getDepositRef(), w.getAmount(),
                w.getAccountNumber(), w.getRef(), w.getStatus().name(),
                w.getWithdrawnAt(), w.getDecidedAt()
        );
    }
}
