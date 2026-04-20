package com.novabank.banking.repository;

import com.novabank.banking.entity.LoanPrepayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoanPrepaymentRepository extends JpaRepository<LoanPrepayment, Long> {
    List<LoanPrepayment> findByCustomerUsernameOrderByAppliedOnDesc(String username);
    List<LoanPrepayment> findAllByOrderByAppliedOnDesc();
}
