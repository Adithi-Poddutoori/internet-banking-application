package com.novabank.banking.repository;

import com.novabank.banking.entity.TermAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TermAccountRepository extends JpaRepository<TermAccount, Long> {

    Optional<TermAccount> findByAccountNumber(String accountNumber);

    List<TermAccount> findByCustomerIdOrderByDateOfOpeningDesc(Long customerId);
}
