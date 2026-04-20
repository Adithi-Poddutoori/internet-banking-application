package com.novabank.banking.repository;

import com.novabank.banking.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByCustomerUsernameOrderByExpenseDateDesc(String username);
    Optional<Expense> findByCustomerUsernameAndTransactionId(String username, String transactionId);
    boolean existsByCustomerUsernameAndTransactionId(String username, String transactionId);
    List<Expense> findByCustomerUsernameAndSourceOrderByExpenseDateDesc(String username, String source);
}
