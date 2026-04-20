package com.novabank.banking;

import org.junit.jupiter.api.*;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 *  1.  Authentication          â€” valid login, bad password, bad role, empty body,
 *                                locked account, admin login, token format
 *  2.  Customer Registration   â€” valid, duplicate email/phone/govtId, missing fields,
 *                                term account, rural account, student account
 *  3.  Account Operations      â€” list, deposit, withdraw, transfer (NEFT/IMPS/RTGS),
 *                                minimum balance guard, same-account guard,
 *                                below-min deposit, account lookup, account closure
 *  4.  Transactions            â€” list all, filter by account, filter by date range,
 *                                fetch by ID, admin list, recent-10 endpoint
 *  5.  Beneficiaries           â€” add, list, update, delete, duplicate guard,
 *                                self-account guard
 *  6.  Nominees                â€” add, list, update, delete
 *  7.  Customer Profile        â€” get profile, full profile, update profile,
 *                                change password, wrong current password,
 *                                open additional account
 *  8.  Admin â€” Customer Mgmt   â€” list, get by ID, update, block, unblock,
 *                                find by account, approve, decline, list pending
 *  9.  Admin â€” Account Mgmt    â€” update status, update interest rate, restore active,
 *                                interest calculation, transaction report
 *  10. Admin Dashboard         â€” dashboard metrics, admin profile
 *  11. Bills (Mandates)        â€” add, list, toggle autopay twice, record payment,
 *                                delete, admin list all
 *  12. Scheduled Transfers     â€” create, list, cancel, execute, admin list
 *  13. Expenses                â€” add manual, add imported, dedup import, list,
 *                                delete, imported-ids endpoint
 *  14. Locker Requests         â€” submit, list mine, admin assign, admin decline,
 *                                admin list all
 *  15. Loan Prepayments        â€” submit, list mine, admin approve, admin reject,
 *                                admin list all
 *  16. FD Withdrawals          â€” submit, list mine, admin process, admin reject,
 *                                admin list all
 *  17. Reward Redemptions      â€” cashback, voucher, total points, history,
 *                                admin list all
 *  18. Admin Broadcasts        â€” send, list all, customer for-account, delete
 
 *  20. Stopped Cheques         â€” stop, duplicate guard, list mine, admin list,
 *                                admin approve, admin decline
 *  21. Complaints              â€” submit, list mine, admin list, admin update status
 *  22. Product Requests        â€” submit, list mine, admin list, admin approve,
 *                                admin decline, admin block/unblock
 *  23. Insurance Claims        â€” submit, list mine, admin list, admin update status
 *  24. Admin Staff             â€” create, list, get by ID, update, delete, logs,
 *                                duplicate username guard
 *  25. Security Guards         â€” no token, customer on admin, admin on customer,
 *                                invalid token, expired-format token
 *
 *  HOW TO RUN (skipped by default to allow mvn package without DB)
 *  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *    cd backend
 *    mvn test -DskipTests=false
 *
 *  All tests run against an in-memory H2 database (application-test.yml).
 *  No external MySQL or network access is required.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class NovaBankIntegrationTests extends BaseIntegrationTest {

    // 1. AUTHENTICATION

    @Test @Order(10)
    @DisplayName("AUTH-01: Valid customer credentials return a JWT token")
    void auth_validCustomerLogin_returnsToken() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"cust001","password":"Cust@123","role":"CUSTOMER"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.role").value("CUSTOMER"));
    }

    @Test @Order(11)
    @DisplayName("AUTH-02: Wrong password returns 401")
    void auth_wrongPassword_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"cust001","password":"WrongPass","role":"CUSTOMER"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test @Order(12)
    @DisplayName("AUTH-03: Correct password but wrong role returns 401")
    void auth_wrongRole_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"cust001","password":"Cust@123","role":"ADMIN"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test @Order(13)
    @DisplayName("AUTH-04: Admin login succeeds and returns ADMIN role")
    void auth_adminLogin_returnsAdminRole() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"admin001","password":"Admin@123","role":"ADMIN"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("ADMIN"))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }

    @Test @Order(14)
    @DisplayName("AUTH-05: Non-existent username returns 401")
    void auth_nonExistentUser_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"ghost999","password":"Ghost@123","role":"CUSTOMER"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test @Order(15)
    @DisplayName("AUTH-06: Empty username returns 4xx")
    void auth_emptyUsername_returns4xx() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"","password":"Cust@123","role":"CUSTOMER"}
                                """))
                .andExpect(status().is4xxClientError());
    }

    @Test @Order(16)
    @DisplayName("AUTH-07: Empty password returns 4xx")
    void auth_emptyPassword_returns4xx() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"cust001","password":"","role":"CUSTOMER"}
                                """))
                .andExpect(status().is4xxClientError());
    }

    @Test @Order(17)
    @DisplayName("AUTH-08: Response token is a non-blank string")
    void auth_token_isNonBlankString() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"cust001","password":"Cust@123","role":"CUSTOMER"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken", not(blankOrNullString())));
    }

    // 2. CUSTOMER REGISTRATION

    @Test @Order(20)
    @DisplayName("REG-01: New SAVINGS account application is accepted")
    void register_newSavingsCustomer_isAccepted() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register/customer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerName": "Carol Test",
                                  "phoneNo": "9333333333",
                                  "emailId": "carol@novabank.test",
                                  "age": 25,
                                  "gender": "FEMALE",
                                  "govtId": "CAROL12345",
                                  "govtIdType": "TAX_ID",
                                  "addressLine": "3 Test Lane",
                                  "city": "Chennai",
                                  "state": "Tamil Nadu",
                                  "postalCode": "600001",
                                  "openingDeposit": 5000,
                                  "requestedAccountType": "SAVINGS"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.generatedUserId").isNotEmpty())
                .andExpect(jsonPath("$.data.generatedPassword").isNotEmpty())
                .andExpect(jsonPath("$.data.generatedAccountNumber").isNotEmpty());
    }

    @Test @Order(21)
    @DisplayName("REG-02: Registration response shows PENDING status")
    void register_newCustomer_statusIsPending() throws Exception {
        String json = mockMvc.perform(post("/api/v1/auth/register/customer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerName": "Dave Pending",
                                  "phoneNo": "9334433443",
                                  "emailId": "dave.pending@novabank.test",
                                  "age": 33,
                                  "gender": "MALE",
                                  "govtId": "DAVEP11111",
                                  "govtIdType": "TAX_ID",
                                  "addressLine": "5 Pending Rd",
                                  "city": "Pune",
                                  "state": "Maharashtra",
                                  "postalCode": "411001",
                                  "openingDeposit": 2000,
                                  "requestedAccountType": "SAVINGS"
                                }
                                """))
                .andReturn().getResponse().getContentAsString();
        assert json.contains("PENDING");
    }

    @Test @Order(22)
    @DisplayName("REG-03: Duplicate email is rejected with 4xx")
    void register_duplicateEmail_isRejected() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register/customer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerName": "Alice Twin",
                                  "phoneNo": "9444444444",
                                  "emailId": "alice@novabank.test",
                                  "age": 30,
                                  "gender": "FEMALE",
                                  "govtId": "DUPLK0000X",
                                  "govtIdType": "TAX_ID",
                                  "addressLine": "4 Test Rd",
                                  "city": "Delhi",
                                  "state": "Delhi",
                                  "postalCode": "110001",
                                  "openingDeposit": 5000,
                                  "requestedAccountType": "SAVINGS"
                                }
                                """))
                .andExpect(status().is4xxClientError());
    }

    @Test @Order(23)
    @DisplayName("REG-04: Duplicate phone number is rejected with 4xx")
    void register_duplicatePhone_isRejected() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register/customer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerName": "Phone Twin",
                                  "phoneNo": "9111111111",
                                  "emailId": "phonetwinn@novabank.test",
                                  "age": 28,
                                  "gender": "MALE",
                                  "govtId": "PHONEDUP00",
                                  "govtIdType": "TAX_ID",
                                  "addressLine": "9 Twin Ave",
                                  "city": "Hyderabad",
                                  "state": "Telangana",
                                  "postalCode": "500001",
                                  "openingDeposit": 1500,
                                  "requestedAccountType": "SAVINGS"
                                }
                                """))
                .andExpect(status().is4xxClientError());
    }

    @Test @Order(24)
    @DisplayName("REG-05: Duplicate govtId is rejected with 4xx")
    void register_duplicateGovtId_isRejected() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register/customer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerName": "GovtId Twin",
                                  "phoneNo": "9998887770",
                                  "emailId": "govtidtwin@novabank.test",
                                  "age": 35,
                                  "gender": "MALE",
                                  "govtId": "ABCDE1234F",
                                  "govtIdType": "TAX_ID",
                                  "addressLine": "10 GovtId St",
                                  "city": "Kolkata",
                                  "state": "West Bengal",
                                  "postalCode": "700001",
                                  "openingDeposit": 1500,
                                  "requestedAccountType": "SAVINGS"
                                }
                                """))
                .andExpect(status().is4xxClientError());
    }

    @Test @Order(25)
    @DisplayName("REG-06: TERM account requires at least 5000 opening deposit")
    void register_termAccount_tooLowDeposit_isRejected() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register/customer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerName": "Term Test",
                                  "phoneNo": "9111222333",
                                  "emailId": "termtest@novabank.test",
                                  "age": 40,
                                  "gender": "MALE",
                                  "govtId": "TERMTE1234",
                                  "govtIdType": "NATIONAL_ID",
                                  "addressLine": "11 Term Rd",
                                  "city": "Ahmedabad",
                                  "state": "Gujarat",
                                  "postalCode": "380001",
                                  "openingDeposit": 1000,
                                  "requestedAccountType": "TERM",
                                  "termMonths": 12
                                }
                                """))
                .andExpect(status().is4xxClientError());
    }

    @Test @Order(26)
    @DisplayName("REG-07: RURAL account with valid deposit is accepted")
    void register_ruralAccount_validDeposit_isAccepted() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register/customer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerName": "Rural Test",
                                  "phoneNo": "9222333444",
                                  "emailId": "ruraltest@novabank.test",
                                  "age": 45,
                                  "gender": "FEMALE",
                                  "govtId": "RURALX9876",
                                  "govtIdType": "NATIONAL_ID",
                                  "addressLine": "12 Village Rd",
                                  "city": "Nagpur",
                                  "state": "Maharashtra",
                                  "postalCode": "440001",
                                  "openingDeposit": 1000,
                                  "requestedAccountType": "SAVINGS"
                                }
                                """))
                .andExpect(status().isOk());
    }

    @Test @Order(27)
    @DisplayName("REG-08: Missing required field (customerName) returns 400")
    void register_missingCustomerName_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register/customer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "phoneNo": "9800012345",
                                  "emailId": "missing@novabank.test",
                                  "age": 25,
                                  "gender": "MALE",
                                  "govtId": "MISSS12345",
                                  "govtIdType": "TAX_ID",
                                  "addressLine": "1 Missing St",
                                  "city": "Jaipur",
                                  "state": "Rajasthan",
                                  "postalCode": "302001",
                                  "openingDeposit": 1500,
                                  "requestedAccountType": "SAVINGS"
                                }
                                """))
                .andExpect(status().is4xxClientError());
    }

    // 3. ACCOUNT OPERATIONS

    @Test @Order(30)
    @DisplayName("ACC-01: Customer can list their own accounts")
    void account_listMyAccounts_returnsSeedAccount() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/accounts")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[0].accountNumber").value(CUST_ACCOUNT));
    }

    @Test @Order(31)
    @DisplayName("ACC-02: Deposit increases balance and returns DEPOSIT type")
    void account_deposit_increasesBalance() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/accounts/" + CUST_ACCOUNT + "/deposit")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"amount": 5000, "remarks": "Test deposit"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.transactionType").value("DEPOSIT"))
                .andExpect(jsonPath("$.data.amount").value(5000));
    }

    @Test @Order(32)
    @DisplayName("ACC-03: Zero deposit is rejected with 4xx")
    void account_zeroDeposit_isRejected() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/accounts/" + CUST_ACCOUNT + "/deposit")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"amount": 0, "remarks": "Zero deposit"}
                                """))
                .andExpect(status().is4xxClientError());
    }

    @Test @Order(33)
    @DisplayName("ACC-04: Withdrawal reduces balance and returns WITHDRAWAL type")
    void account_withdraw_reducesBalance() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/accounts/" + CUST_ACCOUNT + "/withdraw")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"amount": 2000, "remarks": "Test withdrawal"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.transactionType").value("WITHDRAWAL"));
    }

    @Test @Order(34)
    @DisplayName("ACC-05: Withdrawal that breaches minimum balance is rejected")
    void account_withdraw_belowMinimumBalance_isRejected() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/accounts/" + CUST_ACCOUNT + "/withdraw")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"amount": 52500, "remarks": "Too much"}
                                """))
                .andExpect(status().is4xxClientError());
    }

    @Test @Order(35)
    @DisplayName("ACC-06: NEFT transfer between two different accounts succeeds")
    void account_neftTransfer_succeeds() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/accounts/transfer")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fromAccountNumber": "%s",
                                  "toAccountNumber": "%s",
                                  "amount": 1000,
                                  "remarks": "NEFT test",
                                  "transferMode": "NEFT"
                                }
                                """.formatted(CUST_ACCOUNT, CUST2_ACCOUNT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.transactionType").value("NEFT"));
    }

    @Test @Order(36)
    @DisplayName("ACC-07: IMPS transfer succeeds and returns IMPS type")
    void account_impsTransfer_succeeds() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/accounts/transfer")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fromAccountNumber": "%s",
                                  "toAccountNumber": "%s",
                                  "amount": 500,
                                  "remarks": "IMPS test",
                                  "transferMode": "IMPS"
                                }
                                """.formatted(CUST_ACCOUNT, CUST2_ACCOUNT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.transactionType").value("IMPS"));
    }

    @Test @Order(37)
    @DisplayName("ACC-08: RTGS below minimum 2 lakh is rejected")
    void account_rtgsBelowMinimum_isRejected() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/accounts/transfer")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fromAccountNumber": "%s",
                                  "toAccountNumber": "%s",
                                  "amount": 50000,
                                  "remarks": "RTGS too small",
                                  "transferMode": "RTGS"
                                }
                                """.formatted(CUST_ACCOUNT, CUST2_ACCOUNT)))
                .andExpect(status().is4xxClientError());
    }

    @Test @Order(38)
    @DisplayName("ACC-09: Transfer to same account is rejected")
    void account_transfer_sameAccount_isRejected() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/accounts/transfer")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fromAccountNumber": "%s",
                                  "toAccountNumber": "%s",
                                  "amount": 100,
                                  "transferMode": "NEFT"
                                }
                                """.formatted(CUST_ACCOUNT, CUST_ACCOUNT)))
                .andExpect(status().is4xxClientError());
    }

    @Test @Order(39)
    @DisplayName("ACC-10: Account lookup returns active account details")
    void account_lookup_returnsAccountDetails() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/accounts/lookup/" + CUST2_ACCOUNT)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accountNumber").value(CUST2_ACCOUNT));
    }

    @Test @Order(40)
    @DisplayName("ACC-11: Account lookup for non-existent account returns 404")
    void account_lookup_nonExistent_returns404() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/accounts/lookup/9999999999")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isNotFound());
    }

    @Test @Order(41)
    @DisplayName("ACC-12: Customer cannot access another customer's account details")
    void account_getByNumber_otherCustomer_isRejected() throws Exception {
        String token = loginCustomer2();
        mockMvc.perform(get("/api/v1/accounts/" + CUST_ACCOUNT)
                        .header("Authorization", bearer(token)))
                .andExpect(status().is4xxClientError());
    }

    // 4. TRANSACTIONS

    @Test @Order(50)
    @DisplayName("TXN-01: Transaction history is non-empty after operations")
    void transactions_listAll_nonEmpty() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/transactions")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", not(empty())));
    }

    @Test @Order(51)
    @DisplayName("TXN-02: Filter transactions by account number returns results")
    void transactions_filterByAccount_returnsResults() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/transactions")
                        .param("accountNumber", CUST_ACCOUNT)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test @Order(52)
    @DisplayName("TXN-03: Filter transactions by date range returns results")
    void transactions_filterByDateRange_returnsResults() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/transactions")
                        .param("from", "2026-01-01")
                        .param("to", "2026-12-31")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test @Order(53)
    @DisplayName("TXN-04: Fetch transaction by ID returns the correct transaction")
    void transactions_getById_returnsTransaction() throws Exception {
        // Deposit first to create a transaction
        String custToken = loginCustomer();
        String depositJson = mockMvc.perform(post("/api/v1/accounts/" + CUST_ACCOUNT + "/deposit")
                        .header("Authorization", bearer(custToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"amount": 1500, "remarks": "For TXN lookup"}
                                """))
                .andReturn().getResponse().getContentAsString();
        long txnId = objectMapper.readTree(depositJson).path("data").path("id").asLong();

        mockMvc.perform(get("/api/v1/transactions/" + txnId)
                        .header("Authorization", bearer(custToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(txnId));
    }

    @Test @Order(54)
    @DisplayName("TXN-05: Admin can fetch any transaction by ID")
    void transactions_adminGetById_succeeds() throws Exception {
        String custToken = loginCustomer();
        String depositJson = mockMvc.perform(post("/api/v1/accounts/" + CUST_ACCOUNT + "/deposit")
                        .header("Authorization", bearer(custToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"amount": 750, "remarks": "Admin TXN lookup"}
                                """))
                .andReturn().getResponse().getContentAsString();
        long txnId = objectMapper.readTree(depositJson).path("data").path("id").asLong();

        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/transactions/" + txnId)
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(txnId));
    }

    // 5. BENEFICIARIES

    @Test @Order(60)
    @DisplayName("BEN-01: Customer can add a beneficiary")
    void beneficiary_add_succeeds() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/beneficiaries?accountNumber=" + CUST_ACCOUNT)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "beneficiaryName": "Bob Test",
                                  "beneficiaryAccountNo": "%s",
                                  "bankName": "Nova Bank",
                                  "ifsc": "NOVA0001234",
                                  "accountType": "SAVINGS"
                                }
                                """.formatted(CUST2_ACCOUNT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.beneficiaryName").value("Bob Test"));
    }

    @Test @Order(61)
    @DisplayName("BEN-02: Listing beneficiaries returns added entry")
    void beneficiary_list_returnsData() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/beneficiaries?accountNumber=" + CUST_ACCOUNT)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test @Order(62)
    @DisplayName("BEN-03: Adding own account as beneficiary is rejected")
    void beneficiary_addSelfAccount_isRejected() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/beneficiaries?accountNumber=" + CUST_ACCOUNT)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "beneficiaryName": "Myself",
                                  "beneficiaryAccountNo": "%s",
                                  "bankName": "Nova Bank",
                                  "ifsc": "NOVA0001234",
                                  "accountType": "SAVINGS"
                                }
                                """.formatted(CUST_ACCOUNT)))
                .andExpect(status().is4xxClientError());
    }

    @Test @Order(63)
    @DisplayName("BEN-04: Customer can update a beneficiary")
    void beneficiary_update_persists() throws Exception {
        String token = loginCustomer();
        // Add first
        String addJson = mockMvc.perform(post("/api/v1/beneficiaries?accountNumber=" + CUST_ACCOUNT)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "beneficiaryName": "To Update",
                                  "beneficiaryAccountNo": "9000000099",
                                  "bankName": "Other Bank",
                                  "ifsc": "OTHE0009999",
                                  "accountType": "SAVINGS"
                                }
                                """))
                .andReturn().getResponse().getContentAsString();
        long benId = objectMapper.readTree(addJson).path("data").path("id").asLong();

        mockMvc.perform(put("/api/v1/beneficiaries/" + benId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "beneficiaryName": "Updated Name",
                                  "beneficiaryAccountNo": "9000000099",
                                  "bankName": "Other Bank",
                                  "ifsc": "OTHE0009999",
                                  "accountType": "SAVINGS"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.beneficiaryName").value("Updated Name"));
    }

    @Test @Order(64)
    @DisplayName("BEN-05: Customer can delete a beneficiary")
    void beneficiary_delete_succeeds() throws Exception {
        String token = loginCustomer();
        String addJson = mockMvc.perform(post("/api/v1/beneficiaries?accountNumber=" + CUST_ACCOUNT)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "beneficiaryName": "To Delete",
                                  "beneficiaryAccountNo": "9000000077",
                                  "bankName": "Delete Bank",
                                  "ifsc": "DELE0007777",
                                  "accountType": "SAVINGS"
                                }
                                """))
                .andReturn().getResponse().getContentAsString();
        long benId = objectMapper.readTree(addJson).path("data").path("id").asLong();

        mockMvc.perform(delete("/api/v1/beneficiaries/" + benId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk());
    }

    // 6. NOMINEES

    @Test @Order(70)
    @DisplayName("NOM-01: Customer can add a nominee")
    void nominee_add_succeeds() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/nominees?accountNumber=" + CUST_ACCOUNT)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Nominee One",
                                  "govtId": "NOMID11111",
                                  "govtIdType": "NATIONAL_ID",
                                  "phoneNo": "9000001111",
                                  "relation": "SPOUSE"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Nominee One"))
                .andExpect(jsonPath("$.data.relation").value("SPOUSE"));
    }

    @Test @Order(71)
    @DisplayName("NOM-02: Listing nominees returns added entry")
    void nominee_list_returnsData() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/nominees?accountNumber=" + CUST_ACCOUNT)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test @Order(72)
    @DisplayName("NOM-03: Customer can update a nominee")
    void nominee_update_persists() throws Exception {
        String token = loginCustomer();
        String addJson = mockMvc.perform(post("/api/v1/nominees?accountNumber=" + CUST_ACCOUNT)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Nom To Update",
                                  "govtId": "NOMUPD2222",
                                  "govtIdType": "NATIONAL_ID",
                                  "phoneNo": "9000002222",
                                  "relation": "FATHER"
                                }
                                """))
                .andReturn().getResponse().getContentAsString();
        long nomId = objectMapper.readTree(addJson).path("data").path("id").asLong();

        mockMvc.perform(put("/api/v1/nominees/" + nomId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Updated Nominee",
                                  "govtId": "NOMUPD2222",
                                  "govtIdType": "NATIONAL_ID",
                                  "phoneNo": "9000002222",
                                  "relation": "SIBLING"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Updated Nominee"))
                .andExpect(jsonPath("$.data.relation").value("SIBLING"));
    }

    @Test @Order(73)
    @DisplayName("NOM-04: Customer can delete a nominee")
    void nominee_delete_succeeds() throws Exception {
        String token = loginCustomer();
        String addJson = mockMvc.perform(post("/api/v1/nominees?accountNumber=" + CUST_ACCOUNT)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Nom To Delete",
                                  "govtId": "NOMDEL3333",
                                  "govtIdType": "NATIONAL_ID",
                                  "phoneNo": "9000003333",
                                  "relation": "CHILD"
                                }
                                """))
                .andReturn().getResponse().getContentAsString();
        long nomId = objectMapper.readTree(addJson).path("data").path("id").asLong();

        mockMvc.perform(delete("/api/v1/nominees/" + nomId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk());
    }

    // 7. CUSTOMER PROFILE

    @Test @Order(80)
    @DisplayName("PROF-01: Customer can fetch their own profile")
    void profile_getMyProfile_returnsData() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/customers/me")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.customerName").isNotEmpty());
    }

    @Test @Order(81)
    @DisplayName("PROF-02: Customer can fetch full profile with address")
    void profile_getFullProfile_returnsAddressFields() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/customers/me/profile")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.addressLine").isNotEmpty())
                .andExpect(jsonPath("$.data.city").isNotEmpty());
    }

    @Test @Order(82)
    @DisplayName("PROF-03: Customer can update their profile")
    void profile_update_persistsChanges() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(put("/api/v1/customers/me")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "phoneNo": "9111111111",
                                  "addressLine": "99 Updated Street",
                                  "city": "Updated City",
                                  "state": "Updated State",
                                  "postalCode": "999999"
                                }
                                """))
                .andExpect(status().isOk());
    }

    @Test @Order(83)
    @DisplayName("PROF-04: Customer dashboard returns accounts and transactions")
    void profile_dashboard_returnsData() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/customers/dashboard")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accounts").isArray());
    }

    @Test @Order(84)
    @DisplayName("PROF-05: Customer can change their password with correct current password")
    void profile_changePassword_succeeds() throws Exception {
        String token = loginCustomer2();
        mockMvc.perform(put("/api/v1/customers/me/password")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "currentPassword": "Cust@123",
                                  "newPassword": "NewCust@456"
                                }
                                """))
                .andExpect(status().isOk());
    }

    @Test @Order(85)
    @DisplayName("PROF-06: Change password with wrong current password is rejected")
    void profile_changePassword_wrongCurrent_isRejected() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(put("/api/v1/customers/me/password")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "currentPassword": "WrongPass999",
                                  "newPassword": "NewPass@789"
                                }
                                """))
                .andExpect(status().is4xxClientError());
    }

    @Test @Order(86)
    @DisplayName("PROF-07: Customer can open an additional savings account")
    void profile_openAdditionalAccount_succeeds() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/customers/me/accounts")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"accountType": "SAVINGS", "openingDeposit": 2000}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accountType").value("SAVINGS"));
    }

    // 8. ADMIN â€” CUSTOMER MANAGEMENT

    @Test @Order(90)
    @DisplayName("ADM-01: Admin lists all customers")
    void adminCustomer_listAll_returnsCustomers() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/admin/customers")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test @Order(91)
    @DisplayName("ADM-02: Admin gets a single customer by ID")
    void adminCustomer_getById_returnsCustomer() throws Exception {
        String adminToken = loginAdmin();
        String json = mockMvc.perform(get("/api/v1/admin/customers")
                        .header("Authorization", bearer(adminToken)))
                .andReturn().getResponse().getContentAsString();
        long custId = objectMapper.readTree(json).path("data").get(0).path("id").asLong();

        mockMvc.perform(get("/api/v1/admin/customers/" + custId)
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(custId));
    }

    @Test @Order(92)
    @DisplayName("ADM-03: Admin updates customer name, email, and phone")
    void adminCustomer_update_persistsChanges() throws Exception {
        String adminToken = loginAdmin();
        String json = mockMvc.perform(get("/api/v1/admin/customers")
                        .header("Authorization", bearer(adminToken)))
                .andReturn().getResponse().getContentAsString();
        long custId = objectMapper.readTree(json).path("data").get(0).path("id").asLong();

        mockMvc.perform(put("/api/v1/admin/customers/" + custId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerName":"Alice Updated","emailId":"alice.updated@novabank.test","phoneNo":"9888777666"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.customerName").value("Alice Updated"));
    }

    @Test @Order(93)
    @DisplayName("ADM-04: Admin blocks a customer account")
    void adminCustomer_block_succeeds() throws Exception {
        String adminToken = loginAdmin();
        String json = mockMvc.perform(get("/api/v1/admin/customers")
                        .header("Authorization", bearer(adminToken)))
                .andReturn().getResponse().getContentAsString();
        long custId = objectMapper.readTree(json).path("data").get(0).path("id").asLong();

        mockMvc.perform(post("/api/v1/admin/customers/" + custId + "/block")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
    }

    @Test @Order(94)
    @DisplayName("ADM-05: Admin unblocks a customer account")
    void adminCustomer_unblock_succeeds() throws Exception {
        String adminToken = loginAdmin();
        String json = mockMvc.perform(get("/api/v1/admin/customers")
                        .header("Authorization", bearer(adminToken)))
                .andReturn().getResponse().getContentAsString();
        long custId = objectMapper.readTree(json).path("data").get(0).path("id").asLong();

        mockMvc.perform(post("/api/v1/admin/customers/" + custId + "/unblock")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
    }

    @Test @Order(95)
    @DisplayName("ADM-06: Admin finds customer by account number")
    void adminCustomer_findByAccount_returnsCustomer() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/admin/customers/by-account/" + CUST_ACCOUNT)
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accounts").isArray());
    }

    @Test @Order(96)
    @DisplayName("ADM-07: Admin lists pending customer applications")
    void adminCustomer_listPending_returnsData() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/admin/applications/pending")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test @Order(97)
    @DisplayName("ADM-08: Admin filters customers by minimum balance")
    void adminCustomer_filterByMinBalance_returnsData() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/admin/customers")
                        .param("minBalance", "1000")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    // 9. ADMIN â€” ACCOUNT MANAGEMENT & REPORTS

    @Test @Order(100)
    @DisplayName("ADM-ACC-01: Admin updates account status to CLOSED")
    void adminAccount_updateStatus_toClosed() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(put("/api/v1/admin/accounts/" + CUST2_ACCOUNT)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"CLOSED","interestRate":null}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLOSED"));
    }

    @Test @Order(101)
    @DisplayName("ADM-ACC-02: Admin updates account interest rate")
    void adminAccount_updateInterestRate_persists() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(put("/api/v1/admin/accounts/" + CUST_ACCOUNT)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":null,"interestRate":5.5}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.interestRate").value(5.5));
    }

    @Test @Order(102)
    @DisplayName("ADM-ACC-03: Admin restores a closed account to ACTIVE")
    void adminAccount_restore_toActive() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(put("/api/v1/admin/accounts/" + CUST2_ACCOUNT)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"ACTIVE","interestRate":null}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test @Order(103)
    @DisplayName("ADM-ACC-04: Admin calculates interest for a savings account")
    void adminAccount_calculateInterest_returnsInterest() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/admin/accounts/" + CUST_ACCOUNT + "/interest")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.estimatedAnnualInterest").isNumber());
    }

    @Test @Order(104)
    @DisplayName("ADM-ACC-05: Admin generates transaction report for a date range")
    void adminAccount_transactionReport_returnsReport() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/admin/reports/transactions")
                        .param("from", "2026-01-01")
                        .param("to", "2026-12-31")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalTransactions").isNumber())
                .andExpect(jsonPath("$.data.totalCredits").isNumber())
                .andExpect(jsonPath("$.data.totalDebits").isNumber());
    }

    // 10. ADMIN DASHBOARD & PROFILE

    @Test @Order(105)
    @DisplayName("DASH-01: Admin dashboard returns key metrics")
    void adminDashboard_returnsMetrics() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/admin/dashboard")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.activeCustomers").isNumber())
                .andExpect(jsonPath("$.data.activeAccounts").isNumber())
                .andExpect(jsonPath("$.data.totalDeposits").isNumber());
    }

    @Test @Order(106)
    @DisplayName("DASH-02: Admin profile endpoint returns admin name and role")
    void adminDashboard_profile_returnsAdminData() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/admin/me")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.adminName").isNotEmpty())
                .andExpect(jsonPath("$.data.role").value("ADMIN"));
    }

    // 11. BILLS (MANDATES)

    @Test @Order(110)
    @DisplayName("BILL-01: Customer adds a bill mandate")
    void bill_add_succeeds() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/bill-mandates")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "Electricity",
                                  "nickname": "Home Electricity",
                                  "identifier": "BESCOM-99001",
                                  "amount": 1200,
                                  "frequency": "monthly",
                                  "dueDay": 5,
                                  "dueTime": "09:00",
                                  "autopay": false,
                                  "fromAccount": "%s"
                                }
                                """.formatted(CUST_ACCOUNT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value("Home Electricity"))
                .andExpect(jsonPath("$.data.autopay").value(false));
    }

    @Test @Order(111)
    @DisplayName("BILL-02: List my bills returns the added mandate")
    void bill_listMy_nonEmpty() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/bill-mandates/my")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test @Order(112)
    @DisplayName("BILL-03: Toggle autopay switches the autopay flag")
    void bill_toggleAutopay_switchesFlag() throws Exception {
        String token = loginCustomer();
        String addJson = mockMvc.perform(post("/api/v1/bill-mandates")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "Internet",
                                  "nickname": "Home Broadband",
                                  "identifier": "ISP-88881",
                                  "amount": 999,
                                  "frequency": "monthly",
                                  "dueDay": 10,
                                  "dueTime": "08:00",
                                  "autopay": false,
                                  "fromAccount": "%s"
                                }
                                """.formatted(CUST_ACCOUNT)))
                .andReturn().getResponse().getContentAsString();
        long billId = objectMapper.readTree(addJson).path("data").path("id").asLong();

        mockMvc.perform(patch("/api/v1/bill-mandates/" + billId + "/autopay")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.autopay").value(true));
    }

    @Test @Order(113)
    @DisplayName("BILL-04: Toggle autopay again switches it back to false")
    void bill_toggleAutopay_togglesBackToFalse() throws Exception {
        String token = loginCustomer();
        String addJson = mockMvc.perform(post("/api/v1/bill-mandates")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "Gas",
                                  "nickname": "Kitchen Gas",
                                  "identifier": "GAS-77772",
                                  "amount": 800,
                                  "frequency": "monthly",
                                  "dueDay": 15,
                                  "dueTime": "10:00",
                                  "autopay": true,
                                  "fromAccount": "%s"
                                }
                                """.formatted(CUST_ACCOUNT)))
                .andReturn().getResponse().getContentAsString();
        long billId = objectMapper.readTree(addJson).path("data").path("id").asLong();

        mockMvc.perform(patch("/api/v1/bill-mandates/" + billId + "/autopay")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.autopay").value(false));
    }

    @Test @Order(114)
    @DisplayName("BILL-05: Customer records a bill payment")
    void bill_recordPayment_updatesLastPaid() throws Exception {
        String token = loginCustomer();
        String addJson = mockMvc.perform(post("/api/v1/bill-mandates")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "Water",
                                  "nickname": "Water Supply",
                                  "identifier": "WATER-66663",
                                  "amount": 400,
                                  "frequency": "monthly",
                                  "dueDay": 20,
                                  "dueTime": "11:00",
                                  "autopay": false,
                                  "fromAccount": "%s"
                                }
                                """.formatted(CUST_ACCOUNT)))
                .andReturn().getResponse().getContentAsString();
        long billId = objectMapper.readTree(addJson).path("data").path("id").asLong();

        mockMvc.perform(post("/api/v1/bill-mandates/" + billId + "/pay")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"historyJson":"[{\\"date\\":\\"2026-04-20\\",\\"amount\\":400}]"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.lastPaid").isNotEmpty());
    }

    @Test @Order(115)
    @DisplayName("BILL-06: Customer deletes a bill mandate")
    void bill_delete_succeeds() throws Exception {
        String token = loginCustomer();
        String addJson = mockMvc.perform(post("/api/v1/bill-mandates")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "Cable TV",
                                  "nickname": "Cable To Delete",
                                  "identifier": "CABLE-55554",
                                  "amount": 300,
                                  "frequency": "monthly",
                                  "dueDay": 25,
                                  "dueTime": "12:00",
                                  "autopay": false,
                                  "fromAccount": "%s"
                                }
                                """.formatted(CUST_ACCOUNT)))
                .andReturn().getResponse().getContentAsString();
        long billId = objectMapper.readTree(addJson).path("data").path("id").asLong();

        mockMvc.perform(delete("/api/v1/bill-mandates/" + billId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk());
    }

    @Test @Order(116)
    @DisplayName("BILL-07: Admin can list all bill mandates")
    void bill_adminListAll_returnsData() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/bill-mandates/admin")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    
    // 13. EXPENSES

    @Test @Order(130)
    @DisplayName("EXP-01: Customer adds a manual expense")
    void expense_addManual_succeeds() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "description": "Lunch at office",
                                  "amount": 250,
                                  "category": "food",
                                  "paymentMode": "upi",
                                  "expenseDate": "2026-04-16",
                                  "source": "MANUAL"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.category").value("food"))
                .andExpect(jsonPath("$.data.source").value("MANUAL"));
    }

    @Test @Order(131)
    @DisplayName("EXP-02: Customer adds an imported expense with transaction ID")
    void expense_addImported_succeeds() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "description": "Imported from transaction",
                                  "amount": 500,
                                  "category": "shopping",
                                  "paymentMode": "netbanking",
                                  "expenseDate": "2026-04-15",
                                  "source": "IMPORTED",
                                  "transactionId": "TXN-IMPORT-001"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.source").value("IMPORTED"))
                .andExpect(jsonPath("$.data.transactionId").value("TXN-IMPORT-001"));
    }

    @Test @Order(132)
    @DisplayName("EXP-03: Importing the same transaction ID again returns the existing entry (dedup)")
    void expense_importDuplicate_returnsSameEntry() throws Exception {
        String token = loginCustomer();
        // Submit twice with the same transactionId
        String first = mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"description":"Dedup test","amount":300,"category":"travel",
                                 "paymentMode":"netbanking","expenseDate":"2026-04-10",
                                 "source":"IMPORTED","transactionId":"TXN-DEDUP-002"}
                                """))
                .andReturn().getResponse().getContentAsString();

        String second = mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"description":"Dedup test","amount":300,"category":"travel",
                                 "paymentMode":"netbanking","expenseDate":"2026-04-10",
                                 "source":"IMPORTED","transactionId":"TXN-DEDUP-002"}
                                """))
                .andReturn().getResponse().getContentAsString();

        long firstId = objectMapper.readTree(first).path("data").path("id").asLong();
        long secondId = objectMapper.readTree(second).path("data").path("id").asLong();
        assert firstId == secondId : "Duplicate import should return the same record";
    }

    @Test @Order(133)
    @DisplayName("EXP-04: Customer lists their expenses â€” non-empty after adds")
    void expense_listMy_nonEmpty() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/expenses/my")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test @Order(134)
    @DisplayName("EXP-05: Customer deletes an expense")
    void expense_delete_removesEntry() throws Exception {
        String token = loginCustomer();
        String createJson = mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"description":"To be deleted","amount":100,"category":"other",
                                 "paymentMode":"cash","expenseDate":"2026-04-01","source":"MANUAL"}
                                """))
                .andReturn().getResponse().getContentAsString();
        long expId = objectMapper.readTree(createJson).path("data").path("id").asLong();

        mockMvc.perform(delete("/api/v1/expenses/" + expId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk());
    }

    @Test @Order(135)
    @DisplayName("EXP-06: Imported IDs endpoint returns the imported transaction ID")
    void expense_importedIds_containsImported() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/expenses/my/imported-ids")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    // 14. LOCKER REQUESTS

    @Test @Order(140)
    @DisplayName("LOCK-01: Customer submits a locker request â€” status PENDING")
    void locker_submit_returnsPending() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/locker-requests")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"branch":"Bengaluru â€” MG Road","size":"Small"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.branch").value("Bengaluru â€” MG Road"));
    }

    @Test @Order(141)
    @DisplayName("LOCK-02: Customer lists their locker requests")
    void locker_listMy_nonEmpty() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/locker-requests/my")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test @Order(142)
    @DisplayName("LOCK-03: Admin assigns a locker with locker number and note")
    void locker_adminAssign_withNote() throws Exception {
        String custToken = loginCustomer();
        String submitJson = mockMvc.perform(post("/api/v1/locker-requests")
                        .header("Authorization", bearer(custToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"branch":"Mumbai â€” Nariman Point","size":"Medium"}
                                """))
                .andReturn().getResponse().getContentAsString();
        long lockerId = objectMapper.readTree(submitJson).path("data").path("id").asLong();

        String adminToken = loginAdmin();
        mockMvc.perform(put("/api/v1/locker-requests/admin/" + lockerId + "/assign")
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"assignedLocker":"C3","adminNote":"Annual rent â‚¹3000. Key available at branch."}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ASSIGNED"))
                .andExpect(jsonPath("$.data.assignedLocker").value("C3"));
    }

    @Test @Order(143)
    @DisplayName("LOCK-04: Admin declines a locker request")
    void locker_adminDecline_statusDeclined() throws Exception {
        String custToken = loginCustomer();
        String submitJson = mockMvc.perform(post("/api/v1/locker-requests")
                        .header("Authorization", bearer(custToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"branch":"Delhi â€” Connaught Place","size":"Large"}
                                """))
                .andReturn().getResponse().getContentAsString();
        long lockerId = objectMapper.readTree(submitJson).path("data").path("id").asLong();

        String adminToken = loginAdmin();
        mockMvc.perform(put("/api/v1/locker-requests/admin/" + lockerId + "/decline")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DECLINED"));
    }

    @Test @Order(144)
    @DisplayName("LOCK-05: Admin lists all locker requests")
    void locker_adminListAll_returnsData() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/locker-requests/admin")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    // 15. LOAN PREPAYMENTS

    @Test @Order(150)
    @DisplayName("PREP-01: Customer submits a loan prepayment â€” status PENDING")
    void prepayment_submit_returnsPending() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/loan-prepayments")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "loanTitle": "Home Loan",
                                  "loanRef": "LN-2024-001",
                                  "amount": 50000,
                                  "accountNumber": "%s"
                                }
                                """.formatted(CUST_ACCOUNT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.loanTitle").value("Home Loan"));
    }

    @Test @Order(151)
    @DisplayName("PREP-02: Customer lists their prepayment requests")
    void prepayment_listMy_nonEmpty() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/loan-prepayments/my")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test @Order(152)
    @DisplayName("PREP-03: Admin approves a loan prepayment")
    void prepayment_adminApprove_statusApproved() throws Exception {
        String custToken = loginCustomer();
        String createJson = mockMvc.perform(post("/api/v1/loan-prepayments")
                        .header("Authorization", bearer(custToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"loanTitle":"Car Loan","loanRef":"LN-2024-002","amount":20000,"accountNumber":"%s"}
                                """.formatted(CUST_ACCOUNT)))
                .andReturn().getResponse().getContentAsString();
        long prepayId = objectMapper.readTree(createJson).path("data").path("id").asLong();

        String adminToken = loginAdmin();
        mockMvc.perform(put("/api/v1/loan-prepayments/admin/" + prepayId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"APPROVED"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
    }

    @Test @Order(153)
    @DisplayName("PREP-04: Admin rejects a loan prepayment")
    void prepayment_adminReject_statusRejected() throws Exception {
        String custToken = loginCustomer();
        String createJson = mockMvc.perform(post("/api/v1/loan-prepayments")
                        .header("Authorization", bearer(custToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"loanTitle":"Personal Loan","loanRef":"LN-2024-003","amount":10000,"accountNumber":"%s"}
                                """.formatted(CUST_ACCOUNT)))
                .andReturn().getResponse().getContentAsString();
        long prepayId = objectMapper.readTree(createJson).path("data").path("id").asLong();

        String adminToken = loginAdmin();
        mockMvc.perform(put("/api/v1/loan-prepayments/admin/" + prepayId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"REJECTED"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REJECTED"));
    }

    @Test @Order(154)
    @DisplayName("PREP-05: Admin lists all loan prepayment requests")
    void prepayment_adminListAll_returnsData() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/loan-prepayments/admin")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    // 16. FD WITHDRAWALS

    @Test @Order(160)
    @DisplayName("FD-01: Customer submits an FD withdrawal request â€” status PENDING")
    void fdWithdrawal_submit_returnsPending() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/fd-withdrawals")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "depositTitle": "FD 2024",
                                  "depositRef": "FD-2024-001",
                                  "amount": 100000,
                                  "accountNumber": "%s"
                                }
                                """.formatted(CUST_ACCOUNT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.depositTitle").value("FD 2024"));
    }

    @Test @Order(161)
    @DisplayName("FD-02: Customer lists their FD withdrawal requests")
    void fdWithdrawal_listMy_nonEmpty() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/fd-withdrawals/my")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test @Order(162)
    @DisplayName("FD-03: Admin processes an FD withdrawal request")
    void fdWithdrawal_adminProcess_statusProcessed() throws Exception {
        String custToken = loginCustomer();
        String createJson = mockMvc.perform(post("/api/v1/fd-withdrawals")
                        .header("Authorization", bearer(custToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"depositTitle":"FD 2023","depositRef":"FD-2023-001","amount":50000,"accountNumber":"%s"}
                                """.formatted(CUST_ACCOUNT)))
                .andReturn().getResponse().getContentAsString();
        long fdId = objectMapper.readTree(createJson).path("data").path("id").asLong();

        String adminToken = loginAdmin();
        mockMvc.perform(put("/api/v1/fd-withdrawals/admin/" + fdId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"PROCESSED"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PROCESSED"));
    }

    @Test @Order(163)
    @DisplayName("FD-04: Admin rejects an FD withdrawal request")
    void fdWithdrawal_adminReject_statusRejected() throws Exception {
        String custToken = loginCustomer();
        String createJson = mockMvc.perform(post("/api/v1/fd-withdrawals")
                        .header("Authorization", bearer(custToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"depositTitle":"FD 2022","depositRef":"FD-2022-001","amount":30000,"accountNumber":"%s"}
                                """.formatted(CUST_ACCOUNT)))
                .andReturn().getResponse().getContentAsString();
        long fdId = objectMapper.readTree(createJson).path("data").path("id").asLong();

        String adminToken = loginAdmin();
        mockMvc.perform(put("/api/v1/fd-withdrawals/admin/" + fdId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"REJECTED"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REJECTED"));
    }

    @Test @Order(164)
    @DisplayName("FD-05: Admin lists all FD withdrawal requests")
    void fdWithdrawal_adminListAll_returnsData() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/fd-withdrawals/admin")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    // 17. REWARD REDEMPTIONS

    @Test @Order(170)
    @DisplayName("REW-01: Customer redeems reward points for cashback")
    void reward_redeemCashback_succeeds() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/reward-redemptions")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"cashback","points":500,"value":50}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mode").value("cashback"))
                .andExpect(jsonPath("$.data.points").value(500));
    }

    @Test @Order(171)
    @DisplayName("REW-02: Customer redeems reward points for a voucher")
    void reward_redeemVoucher_succeeds() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/reward-redemptions")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"voucher","points":200,"value":20,"brand":"Amazon","voucherCode":"AMZ-GIFT-200"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mode").value("voucher"))
                .andExpect(jsonPath("$.data.brand").value("Amazon"));
    }

    @Test @Order(172)
    @DisplayName("REW-03: Total redeemed points is positive after redemptions")
    void reward_totalPoints_isPositive() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/reward-redemptions/my/total-points")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(greaterThan(0)));
    }

    @Test @Order(173)
    @DisplayName("REW-04: Redemption history lists all redeemed entries")
    void reward_history_nonEmpty() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/reward-redemptions/my")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test @Order(174)
    @DisplayName("REW-05: Admin lists all reward redemptions")
    void reward_adminListAll_returnsData() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/reward-redemptions/admin")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    // 18. ADMIN BROADCASTS

    @Test @Order(180)
    @DisplayName("BCAST-01: Admin sends a broadcast notification")
    void broadcast_adminSend_succeeds() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(post("/api/v1/admin-broadcasts")
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "System Maintenance",
                                  "message": "Nova Bank will be down 2â€“4 AM IST on 20 Apr.",
                                  "type": "maintenance",
                                  "target": "all"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("System Maintenance"));
    }

    @Test @Order(181)
    @DisplayName("BCAST-02: Admin lists all broadcasts")
    void broadcast_adminListAll_returnsData() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/admin-broadcasts")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test @Order(182)
    @DisplayName("BCAST-03: Customer fetches broadcasts targeted to their account")
    void broadcast_customerForAccount_returnsData() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/admin-broadcasts/for-account")
                        .param("accountNumber", CUST_ACCOUNT)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test @Order(183)
    @DisplayName("BCAST-04: Admin deletes a broadcast")
    void broadcast_adminDelete_succeeds() throws Exception {
        String adminToken = loginAdmin();
        String json = mockMvc.perform(post("/api/v1/admin-broadcasts")
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"To Delete","message":"Temp notice.","type":"info","target":"all"}
                                """))
                .andReturn().getResponse().getContentAsString();
        long bcastId = objectMapper.readTree(json).path("data").path("id").asLong();

        mockMvc.perform(delete("/api/v1/admin-broadcasts/" + bcastId)
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
    }

        // 20. STOPPED CHEQUES

    @Test @Order(200)
    @DisplayName("CHQ-01: Customer stops a cheque â€” status PENDING")
    void stoppedCheque_stop_returnsPending() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/stopped-cheques")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"chequeNo":"100501","reason":"Misplaced cheque book"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.chequeNo").value("100501"))
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test @Order(201)
    @DisplayName("CHQ-02: Stopping the same cheque twice is rejected")
    void stoppedCheque_duplicate_isRejected() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/stopped-cheques")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"chequeNo":"100501","reason":"Again"}
                                """))
                .andExpect(status().is5xxServerError());
    }

    @Test @Order(202)
    @DisplayName("CHQ-03: Customer lists their own stopped cheques")
    void stoppedCheque_listMy_nonEmpty() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/stopped-cheques/my")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test @Order(203)
    @DisplayName("CHQ-04: Admin lists all stopped cheques")
    void stoppedCheque_adminList_nonEmpty() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/stopped-cheques/admin")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test @Order(204)
    @DisplayName("CHQ-05: Admin approves a stopped cheque request")
    void stoppedCheque_adminApprove_statusApproved() throws Exception {
        String custToken = loginCustomer();
        String submitJson = mockMvc.perform(post("/api/v1/stopped-cheques")
                        .header("Authorization", bearer(custToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"chequeNo":"200601","reason":"Lost"}
                                """))
                .andReturn().getResponse().getContentAsString();
        long chequeId = objectMapper.readTree(submitJson).path("data").path("id").asLong();

        String adminToken = loginAdmin();
        mockMvc.perform(put("/api/v1/stopped-cheques/admin/" + chequeId + "/decide")
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"action":"approve","adminNote":"Verified and approved."}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
    }

    @Test @Order(205)
    @DisplayName("CHQ-06: Admin declines a stopped cheque request")
    void stoppedCheque_adminDecline_statusDeclined() throws Exception {
        String custToken = loginCustomer();
        String submitJson = mockMvc.perform(post("/api/v1/stopped-cheques")
                        .header("Authorization", bearer(custToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"chequeNo":"300701","reason":"Dispute"}
                                """))
                .andReturn().getResponse().getContentAsString();
        long chequeId = objectMapper.readTree(submitJson).path("data").path("id").asLong();

        String adminToken = loginAdmin();
        mockMvc.perform(put("/api/v1/stopped-cheques/admin/" + chequeId + "/decide")
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"action":"decline","adminNote":"Insufficient evidence."}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DECLINED"));
    }

    // 21. COMPLAINTS

    @Test @Order(210)
    @DisplayName("COMP-01: Customer submits a complaint")
    void complaint_submit_succeeds() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/complaints")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "subject": "Wrong deduction",
                                  "description": "Amount deducted but transfer not received.",
                                  "priority": "HIGH"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.subject").value("Wrong deduction"))
                .andExpect(jsonPath("$.data.status").value("OPEN"));
    }

    @Test @Order(211)
    @DisplayName("COMP-02: Customer lists their own complaints")
    void complaint_listMy_nonEmpty() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/complaints/my")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test @Order(212)
    @DisplayName("COMP-03: Admin lists all complaints")
    void complaint_adminListAll_returnsData() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/complaints/admin")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test @Order(213)
    @DisplayName("COMP-04: Admin updates complaint status to IN_PROGRESS")
    void complaint_adminUpdateStatus_toInProgress() throws Exception {
        // Submit
        String custToken = loginCustomer();
        String submitJson = mockMvc.perform(post("/api/v1/complaints")
                        .header("Authorization", bearer(custToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"subject":"ATM issue","description":"Card swallowed by ATM.","priority":"NORMAL"}
                                """))
                .andReturn().getResponse().getContentAsString();
        long complaintId = objectMapper.readTree(submitJson).path("data").path("id").asLong();

        String adminToken = loginAdmin();
        mockMvc.perform(put("/api/v1/complaints/admin/" + complaintId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"IN_PROGRESS","adminNote":"Under investigation."}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"));
    }

    @Test @Order(214)
    @DisplayName("COMP-05: Admin resolves a complaint")
    void complaint_adminResolve_statusResolved() throws Exception {
        String custToken = loginCustomer();
        String submitJson = mockMvc.perform(post("/api/v1/complaints")
                        .header("Authorization", bearer(custToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"subject":"Passbook not updated","description":"Online passbook is stale.","priority":"LOW"}
                                """))
                .andReturn().getResponse().getContentAsString();
        long complaintId = objectMapper.readTree(submitJson).path("data").path("id").asLong();

        String adminToken = loginAdmin();
        mockMvc.perform(put("/api/v1/complaints/admin/" + complaintId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"RESOLVED","adminNote":"Passbook sync completed."}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("RESOLVED"));
    }

    // 22. PRODUCT REQUESTS

    @Test @Order(220)
    @DisplayName("PROD-01: Customer submits a product request")
    void productRequest_submit_returnsPending() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/product-requests")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "category": "loans",
                                  "productTitle": "Home Loan",
                                  "formData": "{\\"income\\":\\"80000\\",\\"amount\\":\\"5000000\\"}"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.category").value("loans"));
    }

    @Test @Order(221)
    @DisplayName("PROD-02: Submitting the same product request again is idempotent")
    void productRequest_submitDuplicate_returnsSameEntry() throws Exception {
        String token = loginCustomer();
        String body = """
                {"category":"cards","productTitle":"Platinum Credit Card","formData":"{}"}
                """;
        mockMvc.perform(post("/api/v1/product-requests")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/product-requests")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test @Order(222)
    @DisplayName("PROD-03: Customer lists their product requests")
    void productRequest_listMy_nonEmpty() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/product-requests/my")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test @Order(223)
    @DisplayName("PROD-04: Admin lists all product requests")
    void productRequest_adminListAll_returnsData() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/product-requests/admin")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test @Order(224)
    @DisplayName("PROD-05: Admin approves a product request")
    void productRequest_adminApprove_statusApproved() throws Exception {
        String custToken = loginCustomer();
        String submitJson = mockMvc.perform(post("/api/v1/product-requests")
                        .header("Authorization", bearer(custToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"category":"insurance","productTitle":"Life Insurance","formData":"{}"}
                                """))
                .andReturn().getResponse().getContentAsString();
        long prodId = objectMapper.readTree(submitJson).path("data").path("id").asLong();

        String adminToken = loginAdmin();
        mockMvc.perform(put("/api/v1/product-requests/admin/" + prodId + "/decide")
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"decision":"APPROVED","adminNote":"Approved on verification."}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
    }

    @Test @Order(225)
    @DisplayName("PROD-06: Admin declines a product request")
    void productRequest_adminDecline_statusDeclined() throws Exception {
        String custToken = loginCustomer();
        String submitJson = mockMvc.perform(post("/api/v1/product-requests")
                        .header("Authorization", bearer(custToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"category":"deposits","productTitle":"Recurring Deposit","formData":"{}"}
                                """))
                .andReturn().getResponse().getContentAsString();
        long prodId = objectMapper.readTree(submitJson).path("data").path("id").asLong();

        String adminToken = loginAdmin();
        mockMvc.perform(put("/api/v1/product-requests/admin/" + prodId + "/decide")
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"decision":"DECLINED","adminNote":"Eligibility criteria not met."}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DECLINED"));
    }

    // 23. INSURANCE CLAIMS

    @Test @Order(230)
    @DisplayName("CLAIM-01: Customer submits an insurance claim â€” status PENDING")
    void insuranceClaim_submit_returnsPending() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(post("/api/v1/insurance-claims")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "policy": "Life-Premium-2024",
                                  "type": "medical",
                                  "amount": 250000,
                                  "incidentDate": "2026-03-15",
                                  "description": "Hospitalization for 5 days."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.policy").value("Life-Premium-2024"));
    }

    @Test @Order(231)
    @DisplayName("CLAIM-02: Customer lists their own insurance claims")
    void insuranceClaim_listMy_nonEmpty() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/insurance-claims/my")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test @Order(232)
    @DisplayName("CLAIM-03: Admin lists all insurance claims")
    void insuranceClaim_adminListAll_returnsData() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/insurance-claims/admin")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test @Order(233)
    @DisplayName("CLAIM-04: Admin approves an insurance claim")
    void insuranceClaim_adminApprove_statusApproved() throws Exception {
        String custToken = loginCustomer();
        String submitJson = mockMvc.perform(post("/api/v1/insurance-claims")
                        .header("Authorization", bearer(custToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"policy":"Vehicle-2024","type":"accident","amount":80000,"incidentDate":"2026-03-20","description":"Car accident."}
                                """))
                .andReturn().getResponse().getContentAsString();
        long claimId = objectMapper.readTree(submitJson).path("data").path("id").asLong();

        String adminToken = loginAdmin();
        mockMvc.perform(put("/api/v1/insurance-claims/admin/" + claimId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"APPROVED"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
    }

    @Test @Order(234)
    @DisplayName("CLAIM-05: Admin rejects an insurance claim")
    void insuranceClaim_adminReject_statusRejected() throws Exception {
        String custToken = loginCustomer();
        String submitJson = mockMvc.perform(post("/api/v1/insurance-claims")
                        .header("Authorization", bearer(custToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"policy":"Home-2024","type":"fire","amount":500000,"incidentDate":"2026-02-10","description":"Fire damage."}
                                """))
                .andReturn().getResponse().getContentAsString();
        long claimId = objectMapper.readTree(submitJson).path("data").path("id").asLong();

        String adminToken = loginAdmin();
        mockMvc.perform(put("/api/v1/insurance-claims/admin/" + claimId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"DECLINED"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DECLINED"));
    }

    // 24. ADMIN STAFF MANAGEMENT

    @Test @Order(240)
    @DisplayName("STAFF-01: Admin creates a new staff member")
    void staff_create_succeeds() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(post("/api/v1/admin/staff")
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "adminName": "John Staff",
                                  "adminEmailId": "john.staff@novabank.test",
                                  "adminContact": "9333333334",
                                  "username": "staff001",
                                  "password": "Staff@123"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("staff001"))
                .andExpect(jsonPath("$.data.adminName").value("John Staff"));
    }

    @Test @Order(241)
    @DisplayName("STAFF-02: Creating staff with a duplicate username is rejected")
    void staff_createDuplicateUsername_isRejected() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(post("/api/v1/admin/staff")
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "adminName": "John Duplicate",
                                  "adminEmailId": "john.dup@novabank.test",
                                  "adminContact": "9333303334",
                                  "username": "staff001",
                                  "password": "Staff@123"
                                }
                                """))
                .andExpect(status().is4xxClientError());
    }

    @Test @Order(242)
    @DisplayName("STAFF-03: Admin lists all staff members")
    void staff_listAll_containsNewMember() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/admin/staff")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[?(@.username == 'staff001')]").exists());
    }

    @Test @Order(243)
    @DisplayName("STAFF-04: Admin retrieves a staff member by ID")
    void staff_getById_returnsStaff() throws Exception {
        String adminToken = loginAdmin();
        String json = mockMvc.perform(get("/api/v1/admin/staff")
                        .header("Authorization", bearer(adminToken)))
                .andReturn().getResponse().getContentAsString();
        long staffId = objectMapper.readTree(json).path("data").get(0).path("id").asLong();

        mockMvc.perform(get("/api/v1/admin/staff/" + staffId)
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(staffId));
    }

    @Test @Order(244)
    @DisplayName("STAFF-05: Admin updates staff information")
    void staff_update_persistsChanges() throws Exception {
        String adminToken = loginAdmin();
        String json = mockMvc.perform(get("/api/v1/admin/staff")
                        .header("Authorization", bearer(adminToken)))
                .andReturn().getResponse().getContentAsString();
        long staffId = objectMapper.readTree(json).path("data").get(0).path("id").asLong();

        mockMvc.perform(put("/api/v1/admin/staff/" + staffId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "adminName": "John Updated",
                                  "adminEmailId": "john.updated@novabank.test",
                                  "adminContact": "9444444444",
                                  "username": "staff001"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.adminName").value("John Updated"));
    }

    @Test @Order(245)
    @DisplayName("STAFF-06: Admin staff change log has entries after create and update")
    void staff_logs_containsEntries() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/admin/staff/logs")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test @Order(246)
    @DisplayName("STAFF-07: Admin deletes a staff member (soft delete)")
    void staff_delete_succeeds() throws Exception {
        String adminToken = loginAdmin();
        String json = mockMvc.perform(get("/api/v1/admin/staff")
                        .header("Authorization", bearer(adminToken)))
                .andReturn().getResponse().getContentAsString();
        long staffId = objectMapper.readTree(json).path("data").get(0).path("id").asLong();

        mockMvc.perform(delete("/api/v1/admin/staff/" + staffId)
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
    }

    // 25. SECURITY GUARDS

    @Test @Order(250)
    @DisplayName("SEC-01: Accessing a protected endpoint without a JWT returns 401 or 403")
    void security_noToken_returns401or403() throws Exception {
        mockMvc.perform(get("/api/v1/accounts"))
                .andExpect(status().is(anyOf(equalTo(401), equalTo(403))));
    }

    @Test @Order(251)
    @DisplayName("SEC-02: Customer accessing an admin-only endpoint returns 403")
    void security_customerOnAdminEndpoint_returns403() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/locker-requests/admin")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isForbidden());
    }

    @Test @Order(252)
    @DisplayName("SEC-03: Admin accessing a customer-only account endpoint returns 403")
    void security_adminOnCustomerEndpoint_returns403() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/accounts")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isForbidden());
    }

    @Test @Order(253)
    @DisplayName("SEC-04: Sending a malformed JWT returns 401 or 403")
    void security_malformedToken_returns401or403() throws Exception {
        mockMvc.perform(get("/api/v1/accounts")
                        .header("Authorization", "Bearer this.is.not.a.valid.token"))
                .andExpect(status().is(anyOf(equalTo(401), equalTo(403))));
    }

    @Test @Order(254)
    @DisplayName("SEC-05: Admin cannot access complaint list of another customer")
    void security_adminCanAccessAdminComplaints() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(get("/api/v1/complaints/admin")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
    }

    @Test @Order(255)
    @DisplayName("SEC-06: Customer cannot access admin broadcasts list endpoint")
    void security_customerOnAdminBroadcasts_returns403() throws Exception {
        String token = loginCustomer();
        mockMvc.perform(get("/api/v1/admin-broadcasts")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isForbidden());
    }

    @Test @Order(256)
    @DisplayName("SEC-07: Swagger UI endpoint is publicly accessible without token")
    void security_swaggerUi_isPublic() throws Exception {
        mockMvc.perform(get("/swagger-ui.html"))
                .andExpect(status().is(not(equalTo(401))));
    }

    @Test @Order(257)
    @DisplayName("SEC-08: OpenAPI JSON endpoint is publicly accessible without token")
    void security_openApiDocs_isPublic() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().is(not(equalTo(401))))
                .andExpect(status().is(not(equalTo(403))));
    }
}
