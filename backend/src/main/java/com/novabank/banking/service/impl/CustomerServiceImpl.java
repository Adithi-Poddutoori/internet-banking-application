package com.novabank.banking.service.impl;

import com.novabank.banking.dto.account.AccountResponse;
import com.novabank.banking.dto.account.OpenAccountRequest;
import com.novabank.banking.dto.auth.CustomerRegistrationResponse;
import com.novabank.banking.dto.auth.RegisterCustomerRequest;
import com.novabank.banking.dto.beneficiary.BeneficiaryResponse;
import com.novabank.banking.dto.customer.CustomerDashboardResponse;
import com.novabank.banking.dto.customer.CustomerProfileResponse;
import com.novabank.banking.dto.customer.CustomerResponse;
import com.novabank.banking.dto.customer.AdminUpdateCustomerRequest;
import com.novabank.banking.dto.customer.UpdateCustomerRequest;
import com.novabank.banking.dto.nominee.NomineeResponse;
import com.novabank.banking.dto.transaction.TransactionResponse;
import com.novabank.banking.entity.*;
import com.novabank.banking.enums.*;
import com.novabank.banking.exception.BadRequestException;
import com.novabank.banking.exception.BusinessException;
import com.novabank.banking.exception.ResourceNotFoundException;
import com.novabank.banking.mapper.BankingMapper;
import com.novabank.banking.repository.AccountRepository;
import com.novabank.banking.repository.CustomerRepository;
import com.novabank.banking.repository.UserRepository;
import com.novabank.banking.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public CustomerRegistrationResponse registerCustomerApplication(RegisterCustomerRequest request) {
        validateCustomerUniqueness(request);
        validateAccountRequest(request);

        String generatedUserId = generateUserId();
        String generatedPassword = generateTempPassword();
        String accountNumber = generateAccountNumber();

        BankUser user = BankUser.builder()
                .username(generatedUserId)
                .password(passwordEncoder.encode(generatedPassword))
                .role(Role.CUSTOMER)
                .active(true)
                .locked(false)
                .build();
        userRepository.save(user);

        Customer customer = Customer.builder()
                .customerName(request.customerName())
                .phoneNo(request.phoneNo())
                .emailId(request.emailId())
                .age(request.age())
                .gender(request.gender())
                .govtId(request.govtId())
                .govtIdType(request.govtIdType())
                .addressLine(request.addressLine())
                .city(request.city())
                .state(request.state())
                .postalCode(request.postalCode())
                .customerStatus(CustomerStatus.PENDING)
                .user(user)
                .build();

        BankAccount account = buildRequestedAccount(customer, request, accountNumber);
        customer.getAccounts().add(account);
        customerRepository.save(customer);

        return new CustomerRegistrationResponse(
                customer.getId(),
                customer.getCustomerName(),
                accountNumber,
                generatedUserId,
                generatedPassword,
                customer.getCustomerStatus(),
                "Application submitted successfully. Your internet banking profile will activate after admin approval."
        );
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerDashboardResponse getDashboard(String username) {
        Customer customer = getCustomerByUsername(username);
        List<BankAccount> accounts = accountRepository.findByCustomerIdOrderByDateOfOpeningDesc(customer.getId());

        List<AccountResponse> accountResponses = accounts.stream()
                .map(BankingMapper::toAccountResponse)
                .toList();

        List<TransactionResponse> transactions = accounts.stream()
                .flatMap(account -> account.getTransactions().stream())
                .sorted(Comparator.comparing(Transaction::getTransactionDateAndTime).reversed())
                .limit(8)
                .map(BankingMapper::toTransactionResponse)
                .toList();

        Set<BeneficiaryResponse> beneficiaries = accounts.stream()
                .flatMap(account -> account.getBeneficiaries().stream())
                .sorted(Comparator.comparing(Beneficiary::getId).reversed())
                .map(BankingMapper::toBeneficiaryResponse)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Set<NomineeResponse> nominees = accounts.stream()
                .flatMap(account -> account.getNominees().stream())
                .sorted(Comparator.comparing(Nominee::getId).reversed())
                .map(BankingMapper::toNomineeResponse)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        return new CustomerDashboardResponse(
                customer.getCustomerName(),
                customer.getCustomerStatus(),
                accountResponses,
                transactions,
                beneficiaries,
                nominees
        );
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerResponse getProfile(String username) {
        return BankingMapper.toCustomerResponse(getCustomerByUsername(username));
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerProfileResponse getFullProfile(String username) {
        return BankingMapper.toCustomerProfileResponse(getCustomerByUsername(username));
    }

    @Override
    @Transactional
    public CustomerResponse updateProfile(String username, UpdateCustomerRequest request) {
        Customer customer = getCustomerByUsername(username);
        if (!customer.getPhoneNo().equals(request.phoneNo()) && customerRepository.existsByPhoneNo(request.phoneNo())) {
            throw new BadRequestException("Phone number is already associated with another customer");
        }

        customer.setAddressLine(request.addressLine());
        customer.setCity(request.city());
        customer.setState(request.state());
        customer.setPostalCode(request.postalCode());
        customer.setPhoneNo(request.phoneNo());
        return BankingMapper.toCustomerResponse(customer);
    }

    @Override
    @Transactional
    public CustomerResponse adminUpdateCustomer(Long customerId, AdminUpdateCustomerRequest request) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        if (request.customerName() != null && !request.customerName().isBlank()) {
            customer.setCustomerName(request.customerName());
        }
        if (request.emailId() != null && !request.emailId().isBlank()) {
            customer.setEmailId(request.emailId());
        }
        if (request.phoneNo() != null && !request.phoneNo().isBlank()) {
            customer.setPhoneNo(request.phoneNo());
        }
        return BankingMapper.toCustomerResponse(customer);
    }

    @Override
    @Transactional
    public AccountResponse openNewAccount(String username, OpenAccountRequest request) {
        Customer customer = getCustomerByUsername(username);
        if (customer.getCustomerStatus() != CustomerStatus.APPROVED) {
            throw new BusinessException("Only approved customers can open additional accounts");
        }

        if (request.accountType() == AccountType.TERM) {
            if (request.termMonths() == null) {
                throw new BadRequestException("Term duration is required for fixed deposit accounts");
            }
            if (request.openingDeposit().compareTo(new BigDecimal("5000.00")) < 0) {
                throw new BusinessException("Fixed deposit opening amount must be at least ₹5,000");
            }
        } else if (request.accountType() == AccountType.STUDENT) {
            if (request.openingDeposit().compareTo(new BigDecimal("0.00")) < 0) {
                throw new BusinessException("Opening deposit cannot be negative");
            }
        } else if (request.accountType() == AccountType.RURAL) {
            if (request.openingDeposit().compareTo(new BigDecimal("500.00")) < 0) {
                throw new BusinessException("Rural account opening deposit must be at least ₹500");
            }
        } else {
            if (request.openingDeposit().compareTo(new BigDecimal("1000.00")) < 0) {
                throw new BusinessException("Savings account opening deposit must be at least ₹1,000");
            }
        }

        String accountNumber = generateAccountNumber();
        BankAccount account;
        if (request.accountType() == AccountType.TERM) {
            BigDecimal deposit = request.openingDeposit().setScale(2, RoundingMode.HALF_UP);
            account = TermAccount.builder()
                    .accountNumber(accountNumber)
                    .accountType(AccountType.TERM)
                    .balance(deposit)
                    .interestRate(new BigDecimal("6.75"))
                    .dateOfOpening(LocalDate.now())
                    .accountStatus(AccountStatus.ACTIVE)
                    .customer(customer)
                    .principalAmount(deposit)
                    .termMonths(request.termMonths())
                    .penaltyAmount(deposit.multiply(new BigDecimal("0.02")).setScale(2, RoundingMode.HALF_UP))
                    .maturityDate(LocalDate.now().plusMonths(request.termMonths()))
                    .build();
        } else {
            BigDecimal minBal = request.accountType() == AccountType.STUDENT ? new BigDecimal("0.00")
                    : request.accountType() == AccountType.RURAL ? new BigDecimal("500.00")
                    : new BigDecimal("1000.00");
            BigDecimal rate = request.accountType() == AccountType.STUDENT ? new BigDecimal("4.00")
                    : request.accountType() == AccountType.RURAL ? new BigDecimal("4.00")
                    : request.accountType() == AccountType.SENIOR_CITIZEN ? new BigDecimal("4.50")
                    : request.accountType() == AccountType.WOMEN ? new BigDecimal("4.00")
                    : new BigDecimal("3.50");
            account = SavingsAccount.builder()
                    .accountNumber(accountNumber)
                    .accountType(request.accountType())
                    .balance(request.openingDeposit().setScale(2, RoundingMode.HALF_UP))
                    .interestRate(rate)
                    .dateOfOpening(LocalDate.now())
                    .accountStatus(AccountStatus.ACTIVE)
                    .customer(customer)
                    .minimumBalance(minBal)
                    .penaltyFee(new BigDecimal("250.00"))
                    .build();
        }

        customer.getAccounts().add(account);
        accountRepository.save(account);
        return BankingMapper.toAccountResponse(account);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CustomerResponse> listAllCustomers(BigDecimal minBalance) {
        List<Customer> customers = (minBalance != null && minBalance.compareTo(BigDecimal.ZERO) > 0)
                ? customerRepository.findAllWithAccountsByMinBalance(minBalance)
                : customerRepository.findAllWithAccounts();

        return customers.stream()
                .sorted(Comparator.comparing(Customer::getId).reversed())
                .map(BankingMapper::toCustomerResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerResponse findCustomerById(Long customerId) {
        Customer customer = customerRepository.findByIdEager(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        return BankingMapper.toCustomerResponse(customer);
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerResponse viewCustomerDetailsByAccount(String accountNumber) {
        BankAccount account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        return BankingMapper.toCustomerResponse(account.getCustomer());
    }

    private void validateCustomerUniqueness(RegisterCustomerRequest request) {
        if (customerRepository.existsByEmailId(request.emailId())) {
            throw new BadRequestException("Email address is already registered");
        }
        if (customerRepository.existsByPhoneNo(request.phoneNo())) {
            throw new BadRequestException("Phone number is already registered");
        }
        if (customerRepository.existsByGovtId(request.govtId())) {
            throw new BadRequestException("Government ID is already registered");
        }
    }

    private void validateAccountRequest(RegisterCustomerRequest request) {
        if (request.requestedAccountType() == AccountType.TERM) {
            if (request.termMonths() == null) {
                throw new BadRequestException("Term account duration is required for fixed accounts");
            }
            if (request.openingDeposit().compareTo(new BigDecimal("5000.00")) < 0) {
                throw new BusinessException("Term account opening deposit must be at least 5000.00");
            }
        }
    }

    private BankAccount buildRequestedAccount(Customer customer, RegisterCustomerRequest request, String accountNumber) {
        if (request.requestedAccountType() == AccountType.SAVINGS) {
            return SavingsAccount.builder()
                    .accountNumber(accountNumber)
                    .accountType(AccountType.SAVINGS)
                    .balance(request.openingDeposit().setScale(2, RoundingMode.HALF_UP))
                    .interestRate(new BigDecimal("3.50"))
                    .dateOfOpening(LocalDate.now())
                    .accountStatus(AccountStatus.PENDING)
                    .customer(customer)
                    .minimumBalance(new BigDecimal("1000.00"))
                    .penaltyFee(new BigDecimal("250.00"))
                    .build();
        }

        BigDecimal openingDeposit = request.openingDeposit().setScale(2, RoundingMode.HALF_UP);
        return TermAccount.builder()
                .accountNumber(accountNumber)
                .accountType(AccountType.TERM)
                .balance(openingDeposit)
                .interestRate(new BigDecimal("6.75"))
                .dateOfOpening(LocalDate.now())
                .accountStatus(AccountStatus.PENDING)
                .customer(customer)
                .principalAmount(openingDeposit)
                .termMonths(request.termMonths())
                .penaltyAmount(openingDeposit.multiply(new BigDecimal("0.02")).setScale(2, RoundingMode.HALF_UP))
                .maturityDate(LocalDate.now().plusMonths(request.termMonths()))
                .build();
    }

    private String generateUserId() {
        String candidate;
        do {
            candidate = "NB" + (100000 + RANDOM.nextInt(900000));
        } while (userRepository.existsByUsername(candidate));
        return candidate;
    }

    private String generateAccountNumber() {
        String candidate;
        do {
            candidate = "74" + (100000000L + Math.abs(RANDOM.nextLong() % 900000000L));
        } while (accountRepository.findByAccountNumber(candidate).isPresent());
        return candidate;
    }

    private String generateTempPassword() {
        return "Temp@" + (100000 + RANDOM.nextInt(900000));
    }

    private Customer getCustomerByUsername(String username) {
        return customerRepository.findByUserUsernameEager(username)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));
    }
}
