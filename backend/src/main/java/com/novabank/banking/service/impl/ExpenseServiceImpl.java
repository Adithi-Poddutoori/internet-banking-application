package com.novabank.banking.service.impl;

import com.novabank.banking.dto.expense.ExpenseRequest;
import com.novabank.banking.dto.expense.ExpenseResponse;
import com.novabank.banking.entity.Customer;
import com.novabank.banking.entity.Expense;
import com.novabank.banking.repository.CustomerRepository;
import com.novabank.banking.repository.ExpenseRepository;
import com.novabank.banking.service.ExpenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExpenseServiceImpl implements ExpenseService {

    private final ExpenseRepository repo;
    private final CustomerRepository customerRepository;

    @Override
    public ExpenseResponse add(String username, ExpenseRequest req) {
        Customer c = customerRepository.findByUserUsername(username)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        // Avoid duplicate imports
        if ("IMPORTED".equalsIgnoreCase(req.source()) && req.transactionId() != null
                && repo.existsByCustomerUsernameAndTransactionId(username, req.transactionId())) {
            return repo.findByCustomerUsernameAndTransactionId(username, req.transactionId())
                    .map(this::toResponse).orElseThrow();
        }

        Expense e = Expense.builder()
                .customerId(c.getId())
                .customerUsername(username)
                .description(req.description())
                .amount(req.amount())
                .category(req.category() != null ? req.category() : "other")
                .paymentMode(req.paymentMode() != null ? req.paymentMode() : "netbanking")
                .expenseDate(req.expenseDate() != null ? LocalDate.parse(req.expenseDate()) : LocalDate.now())
                .source(req.source() != null ? req.source().toUpperCase() : "MANUAL")
                .transactionId(req.transactionId())
                .createdAt(LocalDateTime.now())
                .build();
        return toResponse(repo.save(e));
    }

    @Override
    public List<ExpenseResponse> getMine(String username) {
        return repo.findByCustomerUsernameOrderByExpenseDateDesc(username)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public void delete(Long id, String username) {
        Expense e = repo.findById(id).orElseThrow(() -> new RuntimeException("Expense not found"));
        if (!e.getCustomerUsername().equals(username)) throw new RuntimeException("Access denied");
        repo.delete(e);
    }

    @Override
    public Set<String> getImportedIds(String username) {
        return repo.findByCustomerUsernameAndSourceOrderByExpenseDateDesc(username, "IMPORTED")
                .stream()
                .map(Expense::getTransactionId)
                .filter(id -> id != null && !id.isBlank())
                .collect(Collectors.toSet());
    }

    private ExpenseResponse toResponse(Expense e) {
        return new ExpenseResponse(
                e.getId(), e.getCustomerUsername(), e.getDescription(),
                e.getAmount(), e.getCategory(), e.getPaymentMode(),
                e.getExpenseDate(), e.getSource(), e.getTransactionId(), e.getCreatedAt()
        );
    }
}
