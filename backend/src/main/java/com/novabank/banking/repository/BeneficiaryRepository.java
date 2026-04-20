package com.novabank.banking.repository;

import com.novabank.banking.entity.Beneficiary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Set;

public interface BeneficiaryRepository extends JpaRepository<Beneficiary, Long> {

    Set<Beneficiary> findByBankAccountIdOrderByIdDesc(Long bankAccountId);

    @Modifying
    @Query("DELETE FROM Beneficiary b WHERE b.bankAccount.id IN (SELECT a.id FROM BankAccount a WHERE a.customer.id = :customerId)")
    void deleteAllByCustomerId(Long customerId);
}
