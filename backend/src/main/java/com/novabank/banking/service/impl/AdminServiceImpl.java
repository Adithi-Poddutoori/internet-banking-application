package com.novabank.banking.service.impl;

import com.novabank.banking.dto.account.AccountResponse;
import com.novabank.banking.dto.admin.AdminDashboardResponse;
import com.novabank.banking.dto.admin.AdminProfileResponse;
import com.novabank.banking.dto.admin.DeletedAccountLogResponse;
import com.novabank.banking.dto.admin.InterestCalculationResponse;
import com.novabank.banking.dto.admin.PendingCustomerResponse;
import com.novabank.banking.dto.admin.TransactionReportResponse;
import com.novabank.banking.dto.customer.CustomerResponse;
import com.novabank.banking.entity.DeletedAccountLog;
import com.novabank.banking.dto.transaction.TransactionResponse;
import com.novabank.banking.entity.Admin;
import com.novabank.banking.entity.BankAccount;
import com.novabank.banking.entity.Customer;
import com.novabank.banking.entity.TermAccount;
import com.novabank.banking.entity.Transaction;
import com.novabank.banking.enums.AccountStatus;
import com.novabank.banking.enums.CustomerStatus;
import com.novabank.banking.enums.TransactionStatus;
import com.novabank.banking.enums.TransactionType;
import com.novabank.banking.exception.BusinessException;
import com.novabank.banking.exception.ResourceNotFoundException;
import com.novabank.banking.mapper.BankingMapper;
import com.novabank.banking.repository.AccountRepository;
import com.novabank.banking.repository.AdminRepository;
import com.novabank.banking.repository.BeneficiaryRepository;
import com.novabank.banking.repository.CustomerRepository;
import com.novabank.banking.repository.DeletedAccountLogRepository;
import com.novabank.banking.repository.NomineeRepository;
import com.novabank.banking.repository.TransactionRepository;
import com.novabank.banking.repository.UserRepository;
import com.novabank.banking.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private final AdminRepository adminRepository;
    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final BeneficiaryRepository beneficiaryRepository;
    private final NomineeRepository nomineeRepository;
    private final DeletedAccountLogRepository deletedAccountLogRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public AdminProfileResponse getAdminProfile(String username) {
        Admin admin = adminRepository.findByUserUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Admin profile not found"));
        return new AdminProfileResponse(
                admin.getId(),
                admin.getAdminName(),
                admin.getAdminEmailId(),
                admin.getAdminContact(),
                admin.getUser().getUsername(),
                admin.getUser().getRole().name()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard(String username) {
        Admin admin = adminRepository.findByUserUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Admin profile not found"));

        List<PendingCustomerResponse> pendingApplications = getPendingApplications();
        long pendingRequests = customerRepository.countByCustomerStatus(CustomerStatus.PENDING);
        long activeCustomers = customerRepository.countByCustomerStatus(CustomerStatus.APPROVED);
        long activeAccounts = accountRepository.countByAccountStatus(AccountStatus.ACTIVE);

        BigDecimal totalDeposits = accountRepository.findByAccountStatusOrderByIdDesc(AccountStatus.ACTIVE).stream()
                .map(BankAccount::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().plusDays(1).atStartOfDay().minusSeconds(1);
        BigDecimal totalTransfersToday = transactionRepository.findByTransactionDateAndTimeBetweenOrderByTransactionDateAndTimeDesc(startOfDay, endOfDay)
                .stream()
                .filter(tx -> tx.getTransactionType() == TransactionType.TRANSFER_OUT)
                .map(tx -> tx.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<TransactionResponse> recentTransactions = transactionRepository.findAll().stream()
                .sorted(Comparator.comparing(Transaction::getTransactionDateAndTime).reversed())
                .limit(10)
                .map(BankingMapper::toTransactionResponse)
                .toList();

        return new AdminDashboardResponse(
                admin.getAdminName(),
                pendingRequests,
                activeCustomers,
                activeAccounts,
                totalDeposits,
                totalTransfersToday,
                pendingApplications,
                recentTransactions
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<PendingCustomerResponse> getPendingApplications() {
        return customerRepository.findByCustomerStatusOrderByIdDesc(CustomerStatus.PENDING).stream()
                .map(BankingMapper::toPendingCustomerResponse)
                .toList();
    }

    @Override
    @Transactional
    public CustomerResponse approveCustomer(Long customerId, String remarks) {
        Customer customer = customerRepository.findByIdEager(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        if (customer.getCustomerStatus() != CustomerStatus.PENDING) {
            throw new BusinessException("Only pending customer applications can be approved");
        }

        customer.setCustomerStatus(CustomerStatus.APPROVED);
        customer.setDeclineReason(remarks);
        customer.getUser().setActive(true);
        customer.getAccounts().forEach(account -> account.setAccountStatus(AccountStatus.ACTIVE));

        return BankingMapper.toCustomerResponse(customer);
    }

    @Override
    @Transactional
    public CustomerResponse declineCustomer(Long customerId, String remarks) {
        Customer customer = customerRepository.findByIdEager(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        if (customer.getCustomerStatus() != CustomerStatus.PENDING) {
            throw new BusinessException("Only pending customer applications can be declined");
        }

        customer.setCustomerStatus(CustomerStatus.DECLINED);
        customer.setDeclineReason(remarks != null && !remarks.isBlank() ? remarks : "Application declined by administrator");
        customer.getUser().setActive(false);
        customer.getAccounts().forEach(account -> account.setAccountStatus(AccountStatus.DECLINED));

        return BankingMapper.toCustomerResponse(customer);
    }

    @Override
    @Transactional(readOnly = true)
    public InterestCalculationResponse calculateInterest(String accountNumber) {
        BankAccount account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        BigDecimal base = account.getBalance();
        String note = "Estimated annual savings interest based on current balance.";
        if (account instanceof TermAccount termAccount) {
            base = termAccount.getPrincipalAmount();
            note = "Estimated maturity interest based on principal and chosen term.";
        }

        return new InterestCalculationResponse(
                account.getAccountNumber(),
                account.getAccountType(),
                account.getInterestRate(),
                base,
                BankingMapper.estimateInterest(account),
                note
        );
    }

    @Override
    @Transactional(readOnly = true)
    public TransactionReportResponse generateTransactionReport(LocalDate from, LocalDate to) {
        LocalDate startDate = from != null ? from : LocalDate.now().minusDays(30);
        LocalDate endDate = to != null ? to : LocalDate.now();
        List<TransactionResponse> transactions = transactionRepository
                .findByTransactionDateAndTimeBetweenOrderByTransactionDateAndTimeDesc(
                        startDate.atStartOfDay(),
                        endDate.plusDays(1).atStartOfDay().minusSeconds(1)
                )
                .stream()
                .map(BankingMapper::toTransactionResponse)
                .toList();

        BigDecimal totalCredits = transactions.stream()
                .filter(tx -> tx.transactionType() == TransactionType.DEPOSIT
                        || tx.transactionType() == TransactionType.TRANSFER_IN
                        || tx.transactionType() == TransactionType.INTEREST_CREDIT
                        || tx.transactionType() == TransactionType.ACCOUNT_OPENING)
                .map(TransactionResponse::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalDebits = transactions.stream()
                .filter(tx -> tx.transactionType() == TransactionType.WITHDRAWAL
                        || tx.transactionType() == TransactionType.TRANSFER_OUT
                        || tx.transactionType() == TransactionType.NEFT
                        || tx.transactionType() == TransactionType.IMPS
                        || tx.transactionType() == TransactionType.RTGS)
                .map(TransactionResponse::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new TransactionReportResponse(transactions.size(), totalCredits, totalDebits, transactions);
    }

    @Override
    @Transactional
    public AccountResponse deleteAccount(String accountNumber) {
        BankAccount account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        if (account.getAccountStatus() == AccountStatus.ACTIVE && account.getBalance().compareTo(BigDecimal.ZERO) > 0) {
            throw new BusinessException("Cannot delete an active account with remaining balance. Close the account first.");
        }
        AccountResponse response = BankingMapper.toAccountResponse(account);
        deletedAccountLogRepository.save(DeletedAccountLog.builder()
                .accountNumber(account.getAccountNumber())
                .accountType(account.getAccountType())
                .balanceAtDeletion(account.getBalance())
                .transferredToAccountNumber(null)
                .customerId(account.getCustomer().getId())
                .customerName(account.getCustomer().getCustomerName())
                .deletedAt(LocalDateTime.now())
                .build());
        transactionRepository.deleteAll(account.getTransactions());
        transactionRepository.flush();
        beneficiaryRepository.deleteAll(beneficiaryRepository.findByBankAccountIdOrderByIdDesc(account.getId()));
        beneficiaryRepository.flush();
        nomineeRepository.deleteAll(nomineeRepository.findByBankAccountIdOrderByIdDesc(account.getId()));
        nomineeRepository.flush();
        account.getTransactions().clear();
        account.getBeneficiaries().clear();
        account.getNominees().clear();
        account.getCustomer().getAccounts().remove(account);
        accountRepository.delete(account);
        return response;
    }

    @Override
    @Transactional
    public AccountResponse transferAndDeleteAccount(String accountNumber, String targetAccountNumber) {
        BankAccount source = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Source account not found"));
        BankAccount target = accountRepository.findByAccountNumber(targetAccountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Target account not found"));
        if (source.getAccountNumber().equals(target.getAccountNumber())) {
            throw new BusinessException("Source and target accounts cannot be the same");
        }
        if (target.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException("Target account is not active");
        }
        BigDecimal balance = source.getBalance();
        if (balance.compareTo(BigDecimal.ZERO) > 0) {
            String ref = "TXN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
            source.setBalance(BigDecimal.ZERO);
            target.setBalance(target.getBalance().add(balance));
            accountRepository.save(source);
            accountRepository.save(target);
            Transaction transferOut = Transaction.builder()
                    .transactionReference(ref + "-OUT")
                    .amount(balance)
                    .transactionType(TransactionType.TRANSFER_OUT)
                    .transactionDateAndTime(LocalDateTime.now())
                    .bankAccount(source)
                    .transactionStatus(TransactionStatus.SUCCESS)
                    .transactionRemarks("Admin balance transfer before account deletion")
                    .counterpartyAccountNumber(targetAccountNumber)
                    .balanceAfterTransaction(BigDecimal.ZERO)
                    .build();
            Transaction transferIn = Transaction.builder()
                    .transactionReference(ref + "-IN")
                    .amount(balance)
                    .transactionType(TransactionType.TRANSFER_IN)
                    .transactionDateAndTime(LocalDateTime.now())
                    .bankAccount(target)
                    .transactionStatus(TransactionStatus.SUCCESS)
                    .transactionRemarks("Admin balance transfer from account " + accountNumber)
                    .counterpartyAccountNumber(accountNumber)
                    .balanceAfterTransaction(target.getBalance())
                    .build();
            transactionRepository.save(transferOut);
            transactionRepository.save(transferIn);
        }
        // Now delete the source account (balance is 0)
        AccountResponse response = BankingMapper.toAccountResponse(source);
        deletedAccountLogRepository.save(DeletedAccountLog.builder()
                .accountNumber(source.getAccountNumber())
                .accountType(source.getAccountType())
                .balanceAtDeletion(balance)
                .transferredToAccountNumber(balance.compareTo(BigDecimal.ZERO) > 0 ? targetAccountNumber : null)
                .customerId(source.getCustomer().getId())
                .customerName(source.getCustomer().getCustomerName())
                .deletedAt(LocalDateTime.now())
                .build());
        // Use a fresh DB query to include any transactions just saved (e.g. transferOut)
        transactionRepository.deleteAll(
                transactionRepository.findByBankAccountIdOrderByTransactionDateAndTimeDesc(source.getId()));
        transactionRepository.flush();
        beneficiaryRepository.deleteAll(beneficiaryRepository.findByBankAccountIdOrderByIdDesc(source.getId()));
        beneficiaryRepository.flush();
        nomineeRepository.deleteAll(nomineeRepository.findByBankAccountIdOrderByIdDesc(source.getId()));
        nomineeRepository.flush();
        source.getTransactions().clear();
        source.getBeneficiaries().clear();
        source.getNominees().clear();
        source.getCustomer().getAccounts().remove(source);
        accountRepository.delete(source);
        return response;
    }

    @Override
    @Transactional
    public CustomerResponse blockCustomer(Long customerId) {
        Customer customer = customerRepository.findByIdEager(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        customer.setCustomerStatus(CustomerStatus.BLOCKED);
        customer.getUser().setActive(false);
        customerRepository.save(customer);
        return BankingMapper.toCustomerResponse(customer);
    }

    @Override
    @Transactional
    public CustomerResponse unblockCustomer(Long customerId) {
        Customer customer = customerRepository.findByIdEager(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        customer.setCustomerStatus(CustomerStatus.APPROVED);
        customer.getUser().setActive(true);
        customerRepository.save(customer);
        return BankingMapper.toCustomerResponse(customer);
    }

    @Override
    @Transactional
    public CustomerResponse sendTerminationNotice(Long customerId) {
        Customer customer = customerRepository.findByIdEager(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        customer.setTerminationNoticeDate(LocalDateTime.now());
        customerRepository.save(customer);
        return BankingMapper.toCustomerResponse(customer);
    }

    @Override
    @Transactional
    public CustomerResponse cancelTerminationNotice(Long customerId) {
        Customer customer = customerRepository.findByIdEager(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        if (customer.getTerminationNoticeDate() == null) {
            throw new BusinessException("No active termination notice found for this customer.");
        }
        customer.setTerminationNoticeDate(null);
        customerRepository.save(customer);
        return BankingMapper.toCustomerResponse(customer);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeletedAccountLogResponse> getDeletedAccountLogs(Long customerId) {
        return deletedAccountLogRepository.findByCustomerIdOrderByDeletedAtDesc(customerId)
                .stream()
                .map(log -> new DeletedAccountLogResponse(
                        log.getId(),
                        log.getAccountNumber(),
                        log.getAccountType(),
                        log.getBalanceAtDeletion(),
                        log.getTransferredToAccountNumber(),
                        log.getCustomerId(),
                        log.getCustomerName(),
                        log.getDeletedAt()
                ))
                .toList();
    }

    /**
     * Runs daily at 02:00 AM. Auto-deletes any customer whose termination notice
     * was sent more than 21 days ago and who has not been reinstated.
     */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void autoDeleteTerminatedCustomers() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(21);
        List<Customer> expired = customerRepository.findByTerminationNoticeDateBefore(cutoff);
        for (Customer customer : expired) {
            Long cid = customer.getId();
            Long uid = customer.getUser().getId();
            transactionRepository.deleteAllByCustomerId(cid);
            transactionRepository.flush();
            beneficiaryRepository.deleteAllByCustomerId(cid);
            beneficiaryRepository.flush();
            nomineeRepository.deleteAllByCustomerId(cid);
            nomineeRepository.flush();
            accountRepository.deleteSavingsAccountsByCustomerId(cid);
            accountRepository.deleteTermAccountsByCustomerId(cid);
            accountRepository.deleteAllByCustomerIdNative(cid);
            accountRepository.flush();
            customerRepository.deleteById(cid);
            customerRepository.flush();
            userRepository.deleteById(uid);
        }
    }

    @Override
    @Transactional
    public CustomerResponse deleteCustomer(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        // Capture response before deletion
        CustomerResponse response = BankingMapper.toCustomerResponse(customer);
        Long userId = customer.getUser().getId();

        // Bulk delete all child records using JPQL/native queries to avoid
        // Hibernate cascade/orphan-removal conflicts with JOINED inheritance
        transactionRepository.deleteAllByCustomerId(customerId);
        transactionRepository.flush();
        beneficiaryRepository.deleteAllByCustomerId(customerId);
        beneficiaryRepository.flush();
        nomineeRepository.deleteAllByCustomerId(customerId);
        nomineeRepository.flush();

        // Delete joined-inheritance child tables first, then parent
        accountRepository.deleteSavingsAccountsByCustomerId(customerId);
        accountRepository.deleteTermAccountsByCustomerId(customerId);
        accountRepository.deleteAllByCustomerIdNative(customerId);
        accountRepository.flush();

        // Now delete the customer and the associated user
        customerRepository.deleteById(customerId);
        customerRepository.flush();
        userRepository.deleteById(userId);

        return response;
    }
}
