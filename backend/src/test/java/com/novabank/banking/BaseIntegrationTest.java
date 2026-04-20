package com.novabank.banking;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novabank.banking.entity.*;
import com.novabank.banking.enums.*;
import com.novabank.banking.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Base class that seeds a default admin user and a default customer user with
 * a SAVINGS account before every test, and exposes helper methods to obtain
 * JWT tokens from the auth endpoint.
 *
 * All concrete test classes extend this rather than duplicating seed logic.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class BaseIntegrationTest {

    // ── Admin credentials ────────────────────────────────────────────────────
    protected static final String ADMIN_USER    = "admin001";
    protected static final String ADMIN_PASS    = "Admin@123";

    // ── Customer credentials ─────────────────────────────────────────────────
    protected static final String CUST_USER     = "cust001";
    protected static final String CUST_PASS     = "Cust@123";
    protected static final String CUST_ACCOUNT  = "1000000001";

    // ── Second customer (transfer target) ────────────────────────────────────
    protected static final String CUST2_USER    = "cust002";
    protected static final String CUST2_PASS    = "Cust@123";
    protected static final String CUST2_ACCOUNT = "1000000002";

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper objectMapper;

    @Autowired private   UserRepository                    userRepo;
    @Autowired private   AdminRepository                   adminRepo;
    @Autowired private   CustomerRepository                customerRepo;
    @Autowired private   AccountRepository                 accountRepo;
    @Autowired protected PasswordEncoder                   passwordEncoder;

    @BeforeEach
    void seedDatabase() {
        // Avoid duplicate seeding across tests in the same run
        if (userRepo.existsByUsername(ADMIN_USER)) return;

        // ── Admin ──────────────────────────────────────────────────────────
        BankUser adminUser = BankUser.builder()
                .username(ADMIN_USER)
                .password(passwordEncoder.encode(ADMIN_PASS))
                .role(Role.ADMIN)
                .active(true)
                .locked(false)
                .build();
        userRepo.save(adminUser);

        Admin admin = Admin.builder()
                .adminName("Test Admin")
                .adminContact("9000000001")
                .adminEmailId("admin@novabank.test")
                .user(adminUser)
                .build();
        adminRepo.save(admin);

        // ── Customer 1 ─────────────────────────────────────────────────────
        BankUser custUser1 = BankUser.builder()
                .username(CUST_USER)
                .password(passwordEncoder.encode(CUST_PASS))
                .role(Role.CUSTOMER)
                .active(true)
                .locked(false)
                .build();
        userRepo.save(custUser1);

        Customer customer1 = Customer.builder()
                .customerName("Alice Test")
                .phoneNo("9111111111")
                .emailId("alice@novabank.test")
                .age(30)
                .gender(Gender.FEMALE)
                .govtId("ABCDE1234F")
                .govtIdType(GovtIdType.TAX_ID)
                .addressLine("1 Test St")
                .city("Bengaluru")
                .state("Karnataka")
                .postalCode("560001")
                .customerStatus(CustomerStatus.APPROVED)
                .user(custUser1)
                .build();
        customerRepo.save(customer1);

        SavingsAccount account1 = SavingsAccount.builder()
                .accountNumber(CUST_ACCOUNT)
                .accountType(AccountType.SAVINGS)
                .balance(new BigDecimal("50000.00"))
                .interestRate(new BigDecimal("4.00"))
                .minimumBalance(new BigDecimal("1000.00"))
                .penaltyFee(new BigDecimal("100.00"))
                .dateOfOpening(LocalDate.now())
                .accountStatus(AccountStatus.ACTIVE)
                .customer(customer1)
                .build();
        accountRepo.save(account1);

        // ── Customer 2 (transfer target) ───────────────────────────────────
        BankUser custUser2 = BankUser.builder()
                .username(CUST2_USER)
                .password(passwordEncoder.encode(CUST2_PASS))
                .role(Role.CUSTOMER)
                .active(true)
                .locked(false)
                .build();
        userRepo.save(custUser2);

        Customer customer2 = Customer.builder()
                .customerName("Bob Test")
                .phoneNo("9222222222")
                .emailId("bob@novabank.test")
                .age(28)
                .gender(Gender.MALE)
                .govtId("PQRST9876G")
                .govtIdType(GovtIdType.TAX_ID)
                .addressLine("2 Test Ave")
                .city("Mumbai")
                .state("Maharashtra")
                .postalCode("400001")
                .customerStatus(CustomerStatus.APPROVED)
                .user(custUser2)
                .build();
        customerRepo.save(customer2);

        SavingsAccount account2 = SavingsAccount.builder()
                .accountNumber(CUST2_ACCOUNT)
                .accountType(AccountType.SAVINGS)
                .balance(new BigDecimal("10000.00"))
                .interestRate(new BigDecimal("4.00"))
                .minimumBalance(new BigDecimal("1000.00"))
                .penaltyFee(new BigDecimal("100.00"))
                .dateOfOpening(LocalDate.now())
                .accountStatus(AccountStatus.ACTIVE)
                .customer(customer2)
                .build();
        accountRepo.save(account2);
    }

    // ── Auth helpers ─────────────────────────────────────────────────────────

    protected String loginCustomer() throws Exception {
        return extractToken(login(CUST_USER, CUST_PASS, "CUSTOMER"));
    }

    protected String loginCustomer2() throws Exception {
        return extractToken(login(CUST2_USER, CUST2_PASS, "CUSTOMER"));
    }

    protected String loginAdmin() throws Exception {
        return extractToken(login(ADMIN_USER, ADMIN_PASS, "ADMIN"));
    }

    private MvcResult login(String username, String password, String role) throws Exception {
        String body = """
                {"username":"%s","password":"%s","role":"%s"}
                """.formatted(username, password, role);
        return mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
    }

    protected String extractToken(MvcResult result) throws Exception {
        String json = result.getResponse().getContentAsString();
        return objectMapper.readTree(json).path("data").path("accessToken").asText();
    }

    protected String bearer(String token) {
        return "Bearer " + token;
    }
}
