package com.novabank.banking.service;

import com.novabank.banking.dto.expense.ExpenseRequest;
import com.novabank.banking.dto.expense.ExpenseResponse;

import java.util.List;
import java.util.Set;

public interface ExpenseService {
    ExpenseResponse add(String username, ExpenseRequest request);
    List<ExpenseResponse> getMine(String username);
    void delete(Long id, String username);
    Set<String> getImportedIds(String username);
}
