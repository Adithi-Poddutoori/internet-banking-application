package com.novabank.banking.service;

import com.novabank.banking.dto.transaction.TransactionResponse;

import java.time.LocalDate;
import java.util.List;

public interface TransactionService {

    List<TransactionResponse> getMyTransactions(String accountNumber, LocalDate from, LocalDate to, String username);

    List<TransactionResponse> getRecentTransactionsForUser(String username, int limit);

    List<TransactionResponse> getRecentTransactions(int limit);

    TransactionResponse findTransactionById(Long transactionId, String username, boolean adminAccess);
}
