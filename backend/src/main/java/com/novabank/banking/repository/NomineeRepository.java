package com.novabank.banking.repository;

import com.novabank.banking.entity.Nominee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Set;

public interface NomineeRepository extends JpaRepository<Nominee, Long> {

    Set<Nominee> findByBankAccountIdOrderByIdDesc(Long bankAccountId);

    @Modifying
    @Query("DELETE FROM Nominee n WHERE n.bankAccount.id IN (SELECT a.id FROM BankAccount a WHERE a.customer.id = :customerId)")
    void deleteAllByCustomerId(Long customerId);
}
