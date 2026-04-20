package com.novabank.banking.repository;

import com.novabank.banking.entity.BillMandate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BillMandateRepository extends JpaRepository<BillMandate, Long> {
    List<BillMandate> findByCustomerUsernameOrderByCreatedAtDesc(String username);
    List<BillMandate> findAllByOrderByCreatedAtDesc();
}
