package com.novabank.banking.service;

import com.novabank.banking.dto.account.AccountResponse;
import com.novabank.banking.dto.account.DepositRequest;
import com.novabank.banking.dto.account.TransferRequest;
import com.novabank.banking.dto.account.WithdrawalRequest;
import com.novabank.banking.dto.transaction.TransactionResponse;

import java.util.List;

public interface AccountService {

    List<AccountResponse> getMyAccounts(String username);

    AccountResponse findAccountByNumber(String accountNumber, String username);

    TransactionResponse deposit(String accountNumber, DepositRequest request, String username);

    TransactionResponse withdraw(String accountNumber, WithdrawalRequest request, String username);

    TransactionResponse transfer(TransferRequest request, String username);

    AccountResponse closeAccount(String accountNumber, String username);

    /** Look up any account by number — no ownership check, just existence + active status. */
    AccountResponse lookupAccount(String accountNumber);
}
