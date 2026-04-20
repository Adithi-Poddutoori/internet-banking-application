package com.novabank.banking.repository;

import com.novabank.banking.entity.InsuranceClaim;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InsuranceClaimRepository extends JpaRepository<InsuranceClaim, Long> {
    List<InsuranceClaim> findByCustomerUsernameOrderBySubmittedAtDesc(String username);
    List<InsuranceClaim> findAllByOrderBySubmittedAtDesc();
}
