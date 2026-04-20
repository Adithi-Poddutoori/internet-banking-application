package com.novabank.banking.service.impl;

import com.novabank.banking.dto.account.AccountResponse;
import com.novabank.banking.dto.account.DepositRequest;
import com.novabank.banking.dto.account.TransferRequest;
import com.novabank.banking.dto.account.WithdrawalRequest;
import com.novabank.banking.dto.transaction.TransactionResponse;
import com.novabank.banking.entity.BankAccount;
import com.novabank.banking.entity.SavingsAccount;
import com.novabank.banking.entity.Transaction;
import com.novabank.banking.enums.AccountStatus;
import com.novabank.banking.enums.TransactionStatus;
import com.novabank.banking.enums.TransactionType;
import com.novabank.banking.exception.BusinessException;
import com.novabank.banking.exception.ResourceNotFoundException;
import com.novabank.banking.mapper.BankingMapper;
import com.novabank.banking.repository.AccountRepository;
import com.novabank.banking.repository.TransactionRepository;
import com.novabank.banking.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AccountResponse> getMyAccounts(String username) {
        return accountRepository.findAll().stream()
                .filter(account -> account.getCustomer().getUser().getUsername().equals(username))
                .sorted(Comparator.comparing(BankAccount::getDateOfOpening).reversed())
                .map(BankingMapper::toAccountResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AccountResponse findAccountByNumber(String accountNumber, String username) {
        return BankingMapper.toAccountResponse(getOwnedAccount(accountNumber, username));
    }

    @Override
    @Transactional
    public TransactionResponse deposit(String accountNumber, DepositRequest request, String username) {
        BankAccount account = getOwnedActiveSavingsAccount(accountNumber, username);
        account.setBalance(account.getBalance().add(request.amount()));
        Transaction transaction = recordTransaction(account, request.amount(), TransactionType.DEPOSIT, request.remarks(), null);
        return BankingMapper.toTransactionResponse(transaction);
    }

    @Override
    @Transactional
    public TransactionResponse withdraw(String accountNumber, WithdrawalRequest request, String username) {
        BankAccount account = getOwnedActiveSavingsAccount(accountNumber, username);
        SavingsAccount savingsAccount = (SavingsAccount) account;
        BigDecimal updatedBalance = account.getBalance().subtract(request.amount());
        if (updatedBalance.compareTo(savingsAccount.getMinimumBalance()) < 0) {
            throw new BusinessException("Withdrawal would breach the minimum balance requirement");
        }
        account.setBalance(updatedBalance);
        Transaction transaction = recordTransaction(account, request.amount(), TransactionType.WITHDRAWAL, request.remarks(), null);
        return BankingMapper.toTransactionResponse(transaction);
    }

    @Override
    @Transactional
    public TransactionResponse transfer(TransferRequest request, String username) {
        if (request.fromAccountNumber().equals(request.toAccountNumber())) {
            throw new BusinessException("Sender and receiver account cannot be the same");
        }

        BankAccount sender = getOwnedActiveSavingsAccount(request.fromAccountNumber(), username);

        TransactionType senderType = resolveTransferOutType(request.transferMode());
        TransactionType receiverType = resolveTransferInType(request.transferMode());

        if (senderType == TransactionType.RTGS && request.amount().compareTo(new BigDecimal("200000")) < 0) {
            throw new BusinessException("RTGS transfers require a minimum amount of ₹2,00,000");
        }
        if (senderType == TransactionType.IMPS && request.amount().compareTo(new BigDecimal("500000")) > 0) {
            throw new BusinessException("IMPS transfers cannot exceed ₹5,00,000");
        }

        // Calculate transfer charges
        BigDecimal charges = calculateTransferCharges(senderType, request.amount());
        BigDecimal totalDebit = request.amount().add(charges);

        SavingsAccount senderSavings = (SavingsAccount) sender;
        BigDecimal senderBalanceAfter = sender.getBalance().subtract(totalDebit);
        if (senderBalanceAfter.compareTo(senderSavings.getMinimumBalance()) < 0) {
            throw new BusinessException("Transfer would breach the minimum balance requirement (amount + charges = ₹" + totalDebit + ")");
        }

        sender.setBalance(senderBalanceAfter);

        String chargeNote = charges.compareTo(BigDecimal.ZERO) > 0
                ? request.remarks() + " [Charges: ₹" + charges.toPlainString() + "]"
                : request.remarks();

        Transaction senderTransaction = recordTransaction(
                sender,
                request.amount(),
                senderType,
                chargeNote,
                request.toAccountNumber()
        );

        // Credit the receiver only if their account exists in Nova Bank (same-bank or intra-bank transfer)
        // For external NEFT/IMPS/RTGS transfers the receiver account won't be in our DB — that's expected
        accountRepository.findByAccountNumber(request.toAccountNumber()).ifPresent(receiver -> {
            receiver.setBalance(receiver.getBalance().add(request.amount()));
            recordTransaction(
                    receiver,
                    request.amount(),
                    receiverType,
                    request.remarks(),
                    sender.getAccountNumber()
            );
        });

        return BankingMapper.toTransactionResponse(senderTransaction);
    }

    private BigDecimal calculateTransferCharges(TransactionType type, BigDecimal amount) {
        return switch (type) {
            case NEFT -> {
                if (amount.compareTo(new BigDecimal("10000")) <= 0) yield new BigDecimal("2.50");
                else if (amount.compareTo(new BigDecimal("100000")) <= 0) yield new BigDecimal("5.00");
                else if (amount.compareTo(new BigDecimal("200000")) <= 0) yield new BigDecimal("15.00");
                else yield new BigDecimal("25.00");
            }
            case IMPS -> {
                if (amount.compareTo(new BigDecimal("1000")) <= 0) yield new BigDecimal("1.00");
                else if (amount.compareTo(new BigDecimal("10000")) <= 0) yield new BigDecimal("5.00");
                else if (amount.compareTo(new BigDecimal("100000")) <= 0) yield new BigDecimal("10.00");
                else yield new BigDecimal("15.00");
            }
            case RTGS -> {
                if (amount.compareTo(new BigDecimal("500000")) <= 0) yield new BigDecimal("20.00");
                else yield new BigDecimal("45.00");
            }
            default -> BigDecimal.ZERO; // Same-bank transfers are free
        };
    }

    private TransactionType resolveTransferOutType(String mode) {
        if (mode == null || mode.isBlank()) return TransactionType.TRANSFER_OUT;
        return switch (mode.toUpperCase()) {
            case "NEFT" -> TransactionType.NEFT;
            case "IMPS" -> TransactionType.IMPS;
            case "RTGS" -> TransactionType.RTGS;
            default -> TransactionType.TRANSFER_OUT;
        };
    }

    private TransactionType resolveTransferInType(String mode) {
        // Receiver always gets TRANSFER_IN so credit/debit categorisation
        // stays unambiguous (NEFT/IMPS/RTGS types are reserved for the sender).
        return TransactionType.TRANSFER_IN;
    }

    @Override
    @Transactional
    public AccountResponse closeAccount(String accountNumber, String username) {
        BankAccount account = getOwnedAccount(accountNumber, username);
        if (account.getAccountStatus() == AccountStatus.CLOSED) {
            throw new BusinessException("Account is already closed");
        }
        if (account.getBalance().compareTo(BigDecimal.ZERO) > 0) {
            throw new BusinessException("Transfer or withdraw remaining balance before closing the account");
        }
        account.setAccountStatus(AccountStatus.CLOSED);
        return BankingMapper.toAccountResponse(account);
    }

    private BankAccount getOwnedActiveSavingsAccount(String accountNumber, String username) {
        BankAccount account = getOwnedAccount(accountNumber, username);
        ensureActive(account);
        if (!(account instanceof SavingsAccount)) {
            throw new BusinessException("Transactions are allowed only for active savings accounts in this demo build");
        }
        return account;
    }

    @Override
    @Transactional(readOnly = true)
    public AccountResponse lookupAccount(String accountNumber) {
        BankAccount account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found in Nova Bank"));
        if (account.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException("Account is not active");
        }
        return BankingMapper.toAccountResponse(account);
    }

    private BankAccount getOwnedAccount(String accountNumber, String username) {
        BankAccount account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        if (!account.getCustomer().getUser().getUsername().equals(username)) {
            throw new BusinessException("You can only access your own account");
        }
        return account;
    }

    private void ensureActive(BankAccount account) {
        if (account.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException("Account is not active for transactions");
        }
    }

    private Transaction recordTransaction(
            BankAccount account,
            BigDecimal amount,
            TransactionType transactionType,
            String remarks,
            String counterpartyAccountNumber
    ) {
        Transaction transaction = Transaction.builder()
                .transactionReference(generateTransactionReference())
                .amount(amount)
                .transactionType(transactionType)
                .transactionDateAndTime(LocalDateTime.now())
                .bankAccount(account)
                .transactionStatus(TransactionStatus.SUCCESS)
                .transactionRemarks(remarks)
                .counterpartyAccountNumber(counterpartyAccountNumber)
                .balanceAfterTransaction(account.getBalance())
                .build();
        return transactionRepository.save(transaction);
    }

    private String generateTransactionReference() {
        return "TXN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
    }
}
