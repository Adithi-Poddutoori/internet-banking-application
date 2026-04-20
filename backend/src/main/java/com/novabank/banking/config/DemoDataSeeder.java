package com.novabank.banking.config;

import com.novabank.banking.entity.*;
import com.novabank.banking.enums.*;
import com.novabank.banking.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Seeds the MySQL database with rich demo data on every fresh start.
 * Safe to re-run — checks for the sentinel user "demo_alice" before inserting.
 *
 * Customers seeded
 * ─────────────────
 *  demo_alice / Demo@123   — Alice Sharma   (₹1,85,000 balance)
 *  demo_bob   / Demo@123   — Bob Mehta      (₹75,000  balance)
 *  demo_carol / Demo@123   — Carol Nair     (₹2,40,000 balance)
 *
 * Admin seeded
 * ─────────────
 *  demo_admin / Admin@123
 *
 * What gets created
 * ─────────────────
 *  • 3 customers with savings accounts
 *  • 15+ transactions per customer (credits, debits, transfers)
 *  • Beneficiaries for each customer
 *  • Bill mandates (electricity, water, mobile, broadband)
 *  • Expenses (food, transport, shopping, etc.)
 *  • Product requests: loan (PENDING), insurance (APPROVED), deposits (APPROVED)
 *  • Loan prepayment (PENDING)
 */
@Slf4j
@Component
@Profile("!test")
@RequiredArgsConstructor
public class DemoDataSeeder implements ApplicationRunner {

    private final UserRepository         userRepo;
    private final AdminRepository        adminRepo;
    private final CustomerRepository     customerRepo;
    private final AccountRepository      accountRepo;
    private final TransactionRepository  txRepo;
    private final BeneficiaryRepository  beneficiaryRepo;
    private final BillMandateRepository  billRepo;
    private final ExpenseRepository      expenseRepo;
    private final ProductRequestRepository productRepo;
    private final LoanPrepaymentRepository prepayRepo;
    private final PasswordEncoder        encoder;

    private static final String SENTINEL = "demo_alice";

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepo.existsByUsername(SENTINEL)) {
            log.info("Demo data already present — skipping seed.");
            return;
        }
        log.info("Seeding demo data …");

        // ── Admin ──────────────────────────────────────────────────────────
        BankUser adminUser = saveUser("demo_admin", "Admin@123", Role.ADMIN);
        Admin admin = Admin.builder()
                .adminName("Demo Admin")
                .adminContact("9800000000")
                .adminEmailId("admin@novabank.demo")
                .user(adminUser)
                .build();
        adminRepo.save(admin);

        // ── Customers ──────────────────────────────────────────────────────
        Customer alice = makeCustomer("demo_alice", "Demo@123",
                "Alice Sharma", "9811111111", "alice@novabank.demo",
                28, Gender.FEMALE, "ALICE1234A", GovtIdType.TAX_ID,
                "12 MG Road, Koramangala", "Bengaluru", "Karnataka", "560034");

        Customer bob = makeCustomer("demo_bob", "Demo@123",
                "Bob Mehta", "9822222222", "bob@novabank.demo",
                35, Gender.MALE, "BOBME5678B", GovtIdType.TAX_ID,
                "7 Carter Road, Bandra", "Mumbai", "Maharashtra", "400050");

        Customer carol = makeCustomer("demo_carol", "Demo@123",
                "Carol Nair", "9833333333", "carol@novabank.demo",
                31, Gender.FEMALE, "CAROL9012C", GovtIdType.NATIONAL_ID,
                "3 Anna Salai, T. Nagar", "Chennai", "Tamil Nadu", "600017");

        // ── Accounts ───────────────────────────────────────────────────────
        SavingsAccount aliceAcc = makeAccount("2000000001", alice, "1,85,000");
        SavingsAccount bobAcc   = makeAccount("2000000002", bob,   "75,000");
        SavingsAccount carolAcc = makeAccount("2000000003", carol, "2,40,000");

        // ── Beneficiaries ──────────────────────────────────────────────────
        beneficiaryRepo.save(Beneficiary.builder()
                .beneficiaryName("Bob Mehta").beneficiaryAccountNo("2000000002")
                .ifsc("NOVB0000001").bankName("Nova Bank").accountType(AccountType.SAVINGS)
                .bankAccount(aliceAcc).build());
        beneficiaryRepo.save(Beneficiary.builder()
                .beneficiaryName("Carol Nair").beneficiaryAccountNo("2000000003")
                .ifsc("NOVB0000002").bankName("Nova Bank").accountType(AccountType.SAVINGS)
                .bankAccount(aliceAcc).build());
        beneficiaryRepo.save(Beneficiary.builder()
                .beneficiaryName("Alice Sharma").beneficiaryAccountNo("2000000001")
                .ifsc("NOVB0000001").bankName("Nova Bank").accountType(AccountType.SAVINGS)
                .bankAccount(bobAcc).build());
        beneficiaryRepo.save(Beneficiary.builder()
                .beneficiaryName("Alice Sharma").beneficiaryAccountNo("2000000001")
                .ifsc("NOVB0000001").bankName("Nova Bank").accountType(AccountType.SAVINGS)
                .bankAccount(carolAcc).build());

        // ── Transactions ───────────────────────────────────────────────────
        seedAliceTransactions(aliceAcc);
        seedBobTransactions(bobAcc, aliceAcc);
        seedCarolTransactions(carolAcc);

        // ── Bills ──────────────────────────────────────────────────────────
        seedBills(alice, aliceAcc.getAccountNumber());
        seedBills(bob,   bobAcc.getAccountNumber());

        // ── Expenses ───────────────────────────────────────────────────────
        seedExpenses(alice);
        seedExpenses(bob);

        // ── Product Requests ───────────────────────────────────────────────
        // Alice: Home Loan — PENDING
        productRepo.save(ProductRequest.builder()
                .customerId(alice.getId()).customerUsername("demo_alice").customerName("Alice Sharma")
                .category("loans").productTitle("Home Loan")
                .status("PENDING").appliedOn(LocalDateTime.now().minusDays(3))
                .blocked(true).build());

        // Alice: Personal Loan — APPROVED (unblocked = active)
        productRepo.save(ProductRequest.builder()
                .customerId(alice.getId()).customerUsername("demo_alice").customerName("Alice Sharma")
                .category("loans").productTitle("Personal Loan")
                .status("APPROVED").adminNote("Approved — good credit profile")
                .appliedOn(LocalDateTime.now().minusDays(30))
                .decidedOn(LocalDateTime.now().minusDays(28))
                .blocked(false).build());

        // Alice: Term Life Insurance — APPROVED
        productRepo.save(ProductRequest.builder()
                .customerId(alice.getId()).customerUsername("demo_alice").customerName("Alice Sharma")
                .category("insurance").productTitle("Term Life Insurance")
                .status("APPROVED").adminNote("Policy activated")
                .appliedOn(LocalDateTime.now().minusDays(60))
                .decidedOn(LocalDateTime.now().minusDays(58))
                .blocked(false).build());

        // Alice: Health Insurance — APPROVED
        productRepo.save(ProductRequest.builder()
                .customerId(alice.getId()).customerUsername("demo_alice").customerName("Alice Sharma")
                .category("insurance").productTitle("Health Insurance")
                .status("APPROVED").adminNote("Family floater approved")
                .appliedOn(LocalDateTime.now().minusDays(45))
                .decidedOn(LocalDateTime.now().minusDays(43))
                .blocked(false).build());

        // Alice: Fixed Deposit — APPROVED
        productRepo.save(ProductRequest.builder()
                .customerId(alice.getId()).customerUsername("demo_alice").customerName("Alice Sharma")
                .category("deposits").productTitle("Fixed Deposit")
                .status("APPROVED").adminNote("FD opened at 7.1% p.a.")
                .appliedOn(LocalDateTime.now().minusDays(90))
                .decidedOn(LocalDateTime.now().minusDays(88))
                .blocked(false).build());

        // Bob: Car Loan — APPROVED
        productRepo.save(ProductRequest.builder()
                .customerId(bob.getId()).customerUsername("demo_bob").customerName("Bob Mehta")
                .category("loans").productTitle("Car Loan")
                .status("APPROVED").adminNote("Approved — 80% LTV")
                .appliedOn(LocalDateTime.now().minusDays(20))
                .decidedOn(LocalDateTime.now().minusDays(18))
                .blocked(false).build());

        // Bob: Education Loan — PENDING
        productRepo.save(ProductRequest.builder()
                .customerId(bob.getId()).customerUsername("demo_bob").customerName("Bob Mehta")
                .category("loans").productTitle("Education Loan")
                .status("PENDING").appliedOn(LocalDateTime.now().minusDays(1))
                .blocked(true).build());

        // Bob: Motor Insurance — APPROVED
        productRepo.save(ProductRequest.builder()
                .customerId(bob.getId()).customerUsername("demo_bob").customerName("Bob Mehta")
                .category("insurance").productTitle("Motor Insurance")
                .status("APPROVED").adminNote("Comprehensive policy activated")
                .appliedOn(LocalDateTime.now().minusDays(50))
                .decidedOn(LocalDateTime.now().minusDays(48))
                .blocked(false).build());

        // Carol: Business Loan — DECLINED
        productRepo.save(ProductRequest.builder()
                .customerId(carol.getId()).customerUsername("demo_carol").customerName("Carol Nair")
                .category("loans").productTitle("Business Loan")
                .status("DECLINED").adminNote("Insufficient collateral")
                .appliedOn(LocalDateTime.now().minusDays(15))
                .decidedOn(LocalDateTime.now().minusDays(12))
                .blocked(true).build());

        // Carol: Recurring Deposit — APPROVED
        productRepo.save(ProductRequest.builder()
                .customerId(carol.getId()).customerUsername("demo_carol").customerName("Carol Nair")
                .category("deposits").productTitle("Recurring Deposit")
                .status("APPROVED").adminNote("RD opened at 6.8% p.a.")
                .appliedOn(LocalDateTime.now().minusDays(70))
                .decidedOn(LocalDateTime.now().minusDays(68))
                .blocked(false).build());

        // ── Loan Prepayment ────────────────────────────────────────────────
        prepayRepo.save(LoanPrepayment.builder()
                .customerId(alice.getId()).customerUsername("demo_alice").customerName("Alice Sharma")
                .loanTitle("Personal Loan").loanRef("LN-100001")
                .amount(new BigDecimal("25000.00")).accountNumber("2000000001")
                .ref("PRE-" + System.currentTimeMillis())
                .status(PrepaymentStatus.PENDING)
                .appliedOn(LocalDateTime.now().minusHours(2))
                .build());

        prepayRepo.save(LoanPrepayment.builder()
                .customerId(bob.getId()).customerUsername("demo_bob").customerName("Bob Mehta")
                .loanTitle("Car Loan").loanRef("LN-200001")
                .amount(new BigDecimal("50000.00")).accountNumber("2000000002")
                .ref("PRE-" + (System.currentTimeMillis() + 1))
                .status(PrepaymentStatus.APPROVED)
                .appliedOn(LocalDateTime.now().minusDays(7))
                .decidedAt(LocalDateTime.now().minusDays(6))
                .build());

        log.info("Demo data seeded successfully. Login with demo_alice / Demo@123 (customer) or demo_admin / Admin@123 (admin).");
    }

    private static boolean isCredit(TransactionType t) {
        return t == TransactionType.DEPOSIT
            || t == TransactionType.TRANSFER_IN
            || t == TransactionType.INTEREST_CREDIT
            || t == TransactionType.ACCOUNT_OPENING;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private BankUser saveUser(String username, String password, Role role) {
        BankUser u = BankUser.builder()
                .username(username).password(encoder.encode(password))
                .role(role).active(true).locked(false).build();
        return userRepo.save(u);
    }

    private Customer makeCustomer(String username, String password,
                                  String name, String phone, String email,
                                  int age, Gender gender, String govtId, GovtIdType idType,
                                  String address, String city, String state, String pin) {
        BankUser u = saveUser(username, password, Role.CUSTOMER);
        Customer c = Customer.builder()
                .customerName(name).phoneNo(phone).emailId(email)
                .age(age).gender(gender).govtId(govtId).govtIdType(idType)
                .addressLine(address).city(city).state(state).postalCode(pin)
                .customerStatus(CustomerStatus.APPROVED).user(u).build();
        return customerRepo.save(c);
    }

    private SavingsAccount makeAccount(String accNo, Customer customer, String balanceStr) {
        BigDecimal balance = new BigDecimal(balanceStr.replace(",", ""));
        SavingsAccount acc = SavingsAccount.builder()
                .accountNumber(accNo).accountType(AccountType.SAVINGS)
                .balance(balance).interestRate(new BigDecimal("4.00"))
                .minimumBalance(new BigDecimal("1000.00"))
                .penaltyFee(new BigDecimal("100.00"))
                .dateOfOpening(LocalDate.now().minusMonths(6))
                .accountStatus(AccountStatus.ACTIVE)
                .customer(customer).build();
        return accountRepo.save(acc);
    }

    private void seedAliceTransactions(BankAccount acc) {
        LocalDateTime base = LocalDateTime.now().minusDays(30);
        BigDecimal bal = new BigDecimal("185000.00");

        // Opening credit
        bal = bal.subtract(new BigDecimal("185000.00")); // working backwards
        bal = new BigDecimal("0.00");

        // Rebuild forward
        List<Object[]> txs = List.of(
            new Object[]{"SALARY CREDIT — April",        TransactionType.DEPOSIT,       "85000.00",  0},
            new Object[]{"UPI — Swiggy",                 TransactionType.WITHDRAWAL,    "450.00",    1},
            new Object[]{"Transfer TO 2000000002",       TransactionType.TRANSFER_OUT,  "10000.00",  2},
            new Object[]{"ATM Withdrawal",               TransactionType.WITHDRAWAL,    "5000.00",   4},
            new Object[]{"Zomato order",                 TransactionType.WITHDRAWAL,    "620.00",    5},
            new Object[]{"NEFT from Bob Mehta",          TransactionType.TRANSFER_IN,   "5000.00",   6},
            new Object[]{"Electricity bill auto-pay",    TransactionType.WITHDRAWAL,    "1840.00",   7},
            new Object[]{"Netflix subscription",         TransactionType.WITHDRAWAL,    "649.00",    8},
            new Object[]{"Amazon online shopping",       TransactionType.WITHDRAWAL,    "3299.00",   9},
            new Object[]{"SALARY CREDIT — March",       TransactionType.DEPOSIT,       "85000.00",  10},
            new Object[]{"Uber cab fare",                TransactionType.WITHDRAWAL,    "380.00",    11},
            new Object[]{"Grocery — Big Basket",        TransactionType.WITHDRAWAL,    "2150.00",   13},
            new Object[]{"Medical — pharmacy",          TransactionType.WITHDRAWAL,    "890.00",    15},
            new Object[]{"Interest credit Q1",          TransactionType.INTEREST_CREDIT, "1850.00", 17},
            new Object[]{"FD maturity credit",          TransactionType.DEPOSIT,       "30000.00",  20},
            new Object[]{"Transfer TO 2000000003",      TransactionType.TRANSFER_OUT,  "3000.00",   22},
            new Object[]{"GST refund",                  TransactionType.DEPOSIT,       "1240.00",   24},
            new Object[]{"Gym membership",              TransactionType.WITHDRAWAL,    "2000.00",   25}
        );

        BigDecimal running = new BigDecimal("100000.00");
        int ref = 1001;
        for (Object[] tx : txs) {
            String desc  = (String) tx[0];
            TransactionType type = (TransactionType) tx[1];
            BigDecimal amt = new BigDecimal((String) tx[2]);
            int dayOffset  = (int) tx[3];
            running = isCredit(type) ? running.add(amt) : running.subtract(amt);
            txRepo.save(Transaction.builder()
                    .transactionReference("TXN-A-" + ref++)
                    .amount(amt).transactionType(type)
                    .transactionDateAndTime(base.plusDays(dayOffset))
                    .bankAccount(acc).transactionStatus(TransactionStatus.SUCCESS)
                    .transactionRemarks(desc).balanceAfterTransaction(running)
                    .build());
        }
    }

    private void seedBobTransactions(BankAccount bobAcc, BankAccount aliceAcc) {
        LocalDateTime base = LocalDateTime.now().minusDays(30);

        List<Object[]> txs = List.of(
            new Object[]{"SALARY CREDIT",              TransactionType.DEPOSIT,      "55000.00",  0},
            new Object[]{"NEFT TO Alice Sharma",       TransactionType.NEFT,         "5000.00",   2},
            new Object[]{"Fuel — BPCL",                TransactionType.WITHDRAWAL,   "3000.00",   3},
            new Object[]{"BigBazaar groceries",        TransactionType.WITHDRAWAL,   "1870.00",   5},
            new Object[]{"Mobile recharge Jio",        TransactionType.WITHDRAWAL,   "299.00",    6},
            new Object[]{"EMI — Car Loan",             TransactionType.WITHDRAWAL,   "12500.00",  7},
            new Object[]{"SALARY CREDIT",              TransactionType.DEPOSIT,      "55000.00",  10},
            new Object[]{"Water bill",                 TransactionType.WITHDRAWAL,   "560.00",    12},
            new Object[]{"Electricity bill",           TransactionType.WITHDRAWAL,   "2100.00",   13},
            new Object[]{"Restaurant — Barbeque Nation", TransactionType.WITHDRAWAL, "2800.00",   15},
            new Object[]{"Interest credit",            TransactionType.INTEREST_CREDIT, "750.00", 18},
            new Object[]{"ATM withdrawal",             TransactionType.WITHDRAWAL,   "4000.00",   20},
            new Object[]{"Flipkart — electronics",    TransactionType.WITHDRAWAL,   "8999.00",   22}
        );

        BigDecimal running = new BigDecimal("50000.00");
        int ref = 2001;
        for (Object[] tx : txs) {
            String desc = (String) tx[0];
            TransactionType type = (TransactionType) tx[1];
            BigDecimal amt = new BigDecimal((String) tx[2]);
            int dayOffset = (int) tx[3];
            running = isCredit(type) ? running.add(amt) : running.subtract(amt);
            txRepo.save(Transaction.builder()
                    .transactionReference("TXN-B-" + ref++)
                    .amount(amt).transactionType(type)
                    .transactionDateAndTime(base.plusDays(dayOffset))
                    .bankAccount(bobAcc).transactionStatus(TransactionStatus.SUCCESS)
                    .transactionRemarks(desc).balanceAfterTransaction(running)
                    .build());
        }
    }

    private void seedCarolTransactions(BankAccount acc) {
        LocalDateTime base = LocalDateTime.now().minusDays(30);

        List<Object[]> txs = List.of(
            new Object[]{"SALARY CREDIT — April",    TransactionType.DEPOSIT,        "95000.00",  0},
            new Object[]{"Rent payment",             TransactionType.WITHDRAWAL,     "22000.00",  1},
            new Object[]{"RD installment",           TransactionType.WITHDRAWAL,     "5000.00",   2},
            new Object[]{"Online course — Udemy",   TransactionType.WITHDRAWAL,     "1499.00",   3},
            new Object[]{"Dinner — Taj Hotel",       TransactionType.WITHDRAWAL,     "4500.00",   5},
            new Object[]{"SALARY CREDIT — March",   TransactionType.DEPOSIT,        "95000.00",  10},
            new Object[]{"Flight ticket — Chennai-Delhi", TransactionType.WITHDRAWAL, "5800.00", 12},
            new Object[]{"Hotel booking",            TransactionType.WITHDRAWAL,     "3200.00",   13},
            new Object[]{"Refund — MakeMyTrip",      TransactionType.DEPOSIT,        "1500.00",   16},
            new Object[]{"Medical insurance premium",TransactionType.WITHDRAWAL,     "2400.00",   18},
            new Object[]{"Grocery — Reliance Fresh", TransactionType.WITHDRAWAL,     "1750.00",   20},
            new Object[]{"Interest credit Q1",      TransactionType.INTEREST_CREDIT, "2400.00",   25},
            new Object[]{"Transfer TO 2000000001",  TransactionType.TRANSFER_OUT,   "3000.00",   28},
            new Object[]{"Dividends — mutual fund", TransactionType.DEPOSIT,        "6500.00",   29}
        );

        BigDecimal running = new BigDecimal("180000.00");
        int ref = 3001;
        for (Object[] tx : txs) {
            String desc = (String) tx[0];
            TransactionType type = (TransactionType) tx[1];
            BigDecimal amt = new BigDecimal((String) tx[2]);
            int dayOffset = (int) tx[3];
            running = isCredit(type) ? running.add(amt) : running.subtract(amt);
            txRepo.save(Transaction.builder()
                    .transactionReference("TXN-C-" + ref++)
                    .amount(amt).transactionType(type)
                    .transactionDateAndTime(base.plusDays(dayOffset))
                    .bankAccount(acc).transactionStatus(TransactionStatus.SUCCESS)
                    .transactionRemarks(desc).balanceAfterTransaction(running)
                    .build());
        }
    }

    private void seedBills(Customer c, String fromAccount) {
        LocalDateTime now = LocalDateTime.now();
        Long cid = c.getId();
        String uname = c.getUser().getUsername();
        String cname = c.getCustomerName();

        billRepo.save(BillMandate.builder()
                .customerId(cid).customerUsername(uname).customerName(cname)
                .type("electricity").nickname("Home Electricity")
                .identifier("ELEC-" + cid + "-001").amount(new BigDecimal("1840.00"))
                .frequency("MONTHLY").dueDay(5).dueTime("09:00")
                .autopay(true).fromAccount(fromAccount)
                .createdAt(now.minusDays(60)).build());

        billRepo.save(BillMandate.builder()
                .customerId(cid).customerUsername(uname).customerName(cname)
                .type("mobile").nickname("Jio Postpaid")
                .identifier("JIO-" + cid + "-002").amount(new BigDecimal("499.00"))
                .frequency("MONTHLY").dueDay(10).dueTime("10:00")
                .autopay(false).fromAccount(fromAccount)
                .createdAt(now.minusDays(45)).build());

        billRepo.save(BillMandate.builder()
                .customerId(cid).customerUsername(uname).customerName(cname)
                .type("broadband").nickname("ACT Fibernet")
                .identifier("ACT-" + cid + "-003").amount(new BigDecimal("999.00"))
                .frequency("MONTHLY").dueDay(15).dueTime("10:00")
                .autopay(true).fromAccount(fromAccount)
                .createdAt(now.minusDays(30)).build());
    }

    private void seedExpenses(Customer c) {
        LocalDate today = LocalDate.now();
        Long cid = c.getId();
        String uname = c.getUser().getUsername();
        LocalDateTime now = LocalDateTime.now();

        List<Object[]> exps = List.of(
            new Object[]{"Lunch at office canteen",   "1250.00", "food",          "upi",        -1},
            new Object[]{"Metro card recharge",       "500.00",  "transport",     "netbanking",  -3},
            new Object[]{"Books — Amazon",            "899.00",  "education",     "card",        -5},
            new Object[]{"Movie tickets — PVR",       "700.00",  "entertainment", "upi",         -6},
            new Object[]{"Grocery shopping",         "2100.00", "shopping",      "card",        -8},
            new Object[]{"Doctor consultation",       "600.00",  "health",        "cash",        -10},
            new Object[]{"Weekend trip fuel",        "3000.00", "travel",        "card",        -12},
            new Object[]{"Electricity bill",         "1840.00", "bills",         "netbanking",  -14}
        );

        for (Object[] e : exps) {
            expenseRepo.save(Expense.builder()
                    .customerId(cid).customerUsername(uname)
                    .description((String) e[0])
                    .amount(new BigDecimal((String) e[1]))
                    .category((String) e[2])
                    .paymentMode((String) e[3])
                    .expenseDate(today.plusDays((int) e[4]))
                    .source("MANUAL")
                    .createdAt(now)
                    .build());
        }
    }
}
