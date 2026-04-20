package com.novabank.banking.service.impl;

import com.novabank.banking.dto.transaction.TransactionResponse;
import com.novabank.banking.entity.BankAccount;
import com.novabank.banking.entity.Customer;
import com.novabank.banking.entity.Transaction;
import com.novabank.banking.exception.BusinessException;
import com.novabank.banking.exception.ResourceNotFoundException;
import com.novabank.banking.mapper.BankingMapper;
import com.novabank.banking.repository.AccountRepository;
import com.novabank.banking.repository.CustomerRepository;
import com.novabank.banking.repository.TransactionRepository;
import com.novabank.banking.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransactionServiceImpl implements TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;

    @Override
    @Transactional(readOnly = true)
    public List<TransactionResponse> getMyTransactions(String accountNumber, LocalDate from, LocalDate to, String username) {
        LocalDateTime fromDateTime = from != null ? from.atStartOfDay() : LocalDate.now().minusDays(30).atStartOfDay();
        LocalDateTime toDateTime = to != null ? to.plusDays(1).atStartOfDay().minusSeconds(1) : LocalDateTime.now();

        if (accountNumber != null && !accountNumber.isBlank()) {
            BankAccount account = getOwnedAccount(accountNumber, username);
            return transactionRepository.findByBankAccountIdAndTransactionDateAndTimeBetweenOrderByTransactionDateAndTimeDesc(
                            account.getId(),
                            fromDateTime,
                            toDateTime
                    ).stream()
                    .map(BankingMapper::toTransactionResponse)
                    .toList();
        }

        Customer customer = customerRepository.findByUserUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        return customer.getAccounts().stream()
                .flatMap(account -> account.getTransactions().stream())
                .filter(transaction -> !transaction.getTransactionDateAndTime().isBefore(fromDateTime)
                        && !transaction.getTransactionDateAndTime().isAfter(toDateTime))
                .sorted(Comparator.comparing(Transaction::getTransactionDateAndTime).reversed())
                .map(BankingMapper::toTransactionResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionResponse> getRecentTransactionsForUser(String username, int limit) {
        Customer customer = customerRepository.findByUserUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        return customer.getAccounts().stream()
                .flatMap(account -> account.getTransactions().stream())
                .sorted(Comparator.comparing(Transaction::getTransactionDateAndTime).reversed())
                .limit(limit)
                .map(BankingMapper::toTransactionResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionResponse> getRecentTransactions(int limit) {
        return transactionRepository.findAll().stream()
                .sorted(Comparator.comparing(Transaction::getTransactionDateAndTime).reversed())
                .limit(limit)
                .map(BankingMapper::toTransactionResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TransactionResponse findTransactionById(Long transactionId, String username, boolean adminAccess) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found"));
        if (!adminAccess && !transaction.getBankAccount().getCustomer().getUser().getUsername().equals(username)) {
            throw new BusinessException("You can access only your own transactions");
        }
        return BankingMapper.toTransactionResponse(transaction);
    }

    private BankAccount getOwnedAccount(String accountNumber, String username) {
        BankAccount account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        if (!account.getCustomer().getUser().getUsername().equals(username)) {
            throw new BusinessException("You can access only your own account transactions");
        }
        return account;
    }
}
