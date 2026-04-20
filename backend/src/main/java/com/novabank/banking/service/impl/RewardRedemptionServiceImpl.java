package com.novabank.banking.service.impl;

import com.novabank.banking.dto.reward.RedemptionRequest;
import com.novabank.banking.dto.reward.RedemptionResponse;
import com.novabank.banking.entity.BankAccount;
import com.novabank.banking.entity.Customer;
import com.novabank.banking.entity.RewardRedemption;
import com.novabank.banking.entity.SavingsAccount;
import com.novabank.banking.entity.Transaction;
import com.novabank.banking.enums.AccountStatus;
import com.novabank.banking.enums.TransactionStatus;
import com.novabank.banking.enums.TransactionType;
import com.novabank.banking.repository.AccountRepository;
import com.novabank.banking.repository.CustomerRepository;
import com.novabank.banking.repository.RewardRedemptionRepository;
import com.novabank.banking.repository.TransactionRepository;
import com.novabank.banking.service.RewardRedemptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RewardRedemptionServiceImpl implements RewardRedemptionService {

    private final RewardRedemptionRepository repo;
    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;

    @Override
    @Transactional
    public RedemptionResponse redeem(String username, RedemptionRequest req) {
        Customer c = customerRepository.findByUserUsername(username)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        // For cashback, credit the amount to the customer's first active savings account
        if ("cashback".equalsIgnoreCase(req.mode())) {
            List<BankAccount> accounts = accountRepository.findByCustomerIdOrderByDateOfOpeningDesc(c.getId());
            accounts.stream()
                    .filter(a -> a.getAccountStatus() == AccountStatus.ACTIVE && a instanceof SavingsAccount)
                    .findFirst()
                    .ifPresent(account -> {
                        account.setBalance(account.getBalance().add(req.value()));
                        Transaction tx = Transaction.builder()
                                .transactionReference("TXN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase())
                                .amount(req.value())
                                .transactionType(TransactionType.REWARD_CASHBACK)
                                .transactionDateAndTime(LocalDateTime.now())
                                .bankAccount(account)
                                .transactionStatus(TransactionStatus.SUCCESS)
                                .transactionRemarks("Reward cashback: " + req.points() + " points redeemed")
                                .balanceAfterTransaction(account.getBalance())
                                .build();
                        transactionRepository.save(tx);
                    });
        }

        RewardRedemption r = RewardRedemption.builder()
                .customerId(c.getId())
                .customerUsername(username)
                .mode(req.mode())
                .points(req.points())
                .value(req.value())
                .brand(req.brand())
                .voucherCode(req.voucherCode())
                .redeemedAt(LocalDateTime.now())
                .build();
        return toResponse(repo.save(r));
    }

    @Override
    public List<RedemptionResponse> getMine(String username) {
        return repo.findByCustomerUsernameOrderByRedeemedAtDesc(username)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public int getTotalRedeemedPoints(String username) {
        return repo.sumPointsByUsername(username);
    }

    @Override
    public List<RedemptionResponse> getAll() {
        return repo.findAll().stream()
                .sorted((a, b) -> b.getRedeemedAt().compareTo(a.getRedeemedAt()))
                .map(this::toResponse).toList();
    }

    private RedemptionResponse toResponse(RewardRedemption r) {
        return new RedemptionResponse(
                r.getId(), r.getCustomerUsername(), r.getMode(),
                r.getPoints(), r.getValue(), r.getBrand(),
                r.getVoucherCode(), r.getRedeemedAt()
        );
    }
}
