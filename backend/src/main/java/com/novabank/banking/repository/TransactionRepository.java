package com.novabank.banking.repository;

import com.novabank.banking.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    @Query("SELECT t FROM Transaction t WHERE t.bankAccount.id = :bankAccountId ORDER BY t.transactionDateAndTime DESC")
    List<Transaction> findByBankAccountIdOrderByTransactionDateAndTimeDesc(Long bankAccountId);

    @Query("SELECT t FROM Transaction t WHERE t.bankAccount.id = :bankAccountId AND t.transactionDateAndTime BETWEEN :from AND :to ORDER BY t.transactionDateAndTime DESC")
    List<Transaction> findByBankAccountIdAndTransactionDateAndTimeBetweenOrderByTransactionDateAndTimeDesc(
            Long bankAccountId,
            LocalDateTime from,
            LocalDateTime to
    );

    @Query("SELECT t FROM Transaction t WHERE t.transactionDateAndTime BETWEEN :from AND :to ORDER BY t.transactionDateAndTime DESC")
    List<Transaction> findByTransactionDateAndTimeBetweenOrderByTransactionDateAndTimeDesc(
            LocalDateTime from,
            LocalDateTime to
    );

    @Modifying
    @Query("DELETE FROM Transaction t WHERE t.bankAccount.id IN (SELECT a.id FROM BankAccount a WHERE a.customer.id = :customerId)")
    void deleteAllByCustomerId(Long customerId);
}
