package com.novabank.banking.repository;

import com.novabank.banking.entity.BankAccount;
import com.novabank.banking.enums.AccountStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<BankAccount, Long> {

    Optional<BankAccount> findByAccountNumber(String accountNumber);

    List<BankAccount> findByCustomerIdOrderByDateOfOpeningDesc(Long customerId);

    List<BankAccount> findByAccountStatusOrderByIdDesc(AccountStatus accountStatus);

    long countByAccountStatus(AccountStatus accountStatus);

    @Modifying
    @Query(value = "DELETE FROM savings_accounts WHERE id IN (SELECT id FROM bank_accounts WHERE customer_id = :customerId)", nativeQuery = true)
    void deleteSavingsAccountsByCustomerId(Long customerId);

    @Modifying
    @Query(value = "DELETE FROM term_accounts WHERE id IN (SELECT id FROM bank_accounts WHERE customer_id = :customerId)", nativeQuery = true)
    void deleteTermAccountsByCustomerId(Long customerId);

    @Modifying
    @Query(value = "DELETE FROM bank_accounts WHERE customer_id = :customerId", nativeQuery = true)
    void deleteAllByCustomerIdNative(Long customerId);
}
