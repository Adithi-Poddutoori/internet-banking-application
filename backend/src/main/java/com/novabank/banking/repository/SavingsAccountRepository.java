package com.novabank.banking.repository;

import com.novabank.banking.entity.SavingsAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SavingsAccountRepository extends JpaRepository<SavingsAccount, Long> {

    Optional<SavingsAccount> findByAccountNumber(String accountNumber);

    List<SavingsAccount> findByCustomerIdOrderByDateOfOpeningDesc(Long customerId);
}
