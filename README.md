<div align="center">

```
NovaBanK — Internet Banking Suite
```

# NovaBank — Full-Stack Internet Banking Suite


A production-grade, full-stack internet banking platform that covers the complete customer lifecycle — from self-registration and administrative approval to fund transfers, bill payments, loan management, insurance, rewards, and more. The backend is secured with JWT-based stateless authentication and fully documented via Swagger/OpenAPI. Rich demo data is seeded automatically on first startup.

</div>

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup and Installation](#setup-and-installation)
  - [1. Database Configuration](#1-database-configuration)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Demo Credentials](#demo-credentials)
- [API Reference](#api-reference)
- [Feature Reference](#feature-reference)
- [Data Model](#data-model)
- [Security Design](#security-design)
- [Running Tests](#running-tests)
- [Production Build](#production-build)

---

## Overview

NovaBanK is a full-stack internet banking application built with Spring Boot 3 and React 18. It is designed to simulate a real-world banking environment across two distinct portals.

**Customer Portal** covers account management, fund transfers, bill payments, product applications (loans, cards, insurance, fixed deposits), expense tracking, rewards redemption, complaints, and more.

**Admin Portal** provides bank staff and administrators with full oversight of customer applications and approvals, transaction monitoring, staff management, reporting, follow-up queues, and system-wide announcements.

```
+------------------------------------------------------------------+
|                        CUSTOMER PORTAL                           |
+--------------------+--------------------+------------------------+
| Accounts           | Transactions        | Bills & Payments      |
| Deposits           | Fund Transfers      | Loans & Insurance     |
| Beneficiaries      | Expense Tracker     | Rewards & Redemptions |
| KYC & Profile      | Credit Score        | Notifications         |
| Complaints         | Passbook            | Stopped Cheques       |
+--------------------+--------------------+------------------------+

+------------------------------------------------------------------+
|                          ADMIN PORTAL                            |
+--------------------+--------------------+------------------------+
| Approvals          | Customer Management | Reports & Analytics   |
| Loan Management    | Account Oversight   | System Broadcasts     |
| Staff Management   | Transaction Search  | Follow-up Queue       |
| Locker Requests    | Insurance Claims    | Settings              |
+--------------------+--------------------+------------------------+
```

---

## Architecture

The application follows a standard three-tier architecture. The React SPA and the Spring Boot REST API are fully decoupled.

```
+---------------------------------------------+
|           React 18 Single Page App          |
|         Vite + React Router DOM             |
|              localhost:5173                 |
+----------------------+----------------------+
                       |
              HTTP/REST via Axios
              Authorization: Bearer <JWT>
                       |
+----------------------v----------------------+
|          Spring Boot 3.4.4 REST API         |
|               localhost:9098                |
|                                             |
|  +---------------------------------------+  |
|  |        Spring Security Layer          |  |
|  |       JWT Authentication Filter       |  |
|  +------------------+--------------------+  |
|                     |                       |
|  +------------------v--------------------+  |
|  |         REST Controllers (20)         |  |
|  +------------------+--------------------+  |
|                     |                       |
|  +------------------v--------------------+  |
|  |           Service Layer               |  |
|  +------------------+--------------------+  |
|                     |                       |
|  +------------------v--------------------+  |
|  |    Spring Data JPA Repositories       |  |
|  |         Hibernate ORM (6.6.x)         |  |
|  +------------------+--------------------+  |
+----------------------+----------------------+
                       |
+----------------------v----------------------+
|              MySQL 8.0+ Database            |
|           Database name: novabank           |
|       Schema auto-managed via Hibernate     |
+---------------------------------------------+
```

Key design decisions:

- The frontend communicates with the API exclusively via HTTP/REST. There is no server-side rendering.
- All API endpoints except those under `/api/v1/auth/**` require a valid JWT Bearer token.
- Hibernate `ddl-auto: update` creates and updates the database schema on startup. No migration scripts are required.
- The `DemoDataSeeder` checks for a sentinel record before inserting demo data, making it safe to restart the application without creating duplicate records.

---

## Technology Stack

### Backend

| Component       | Technology                           | Version |
|-----------------|--------------------------------------|---------|
| Language        | Java                                 | 17      |
| Framework       | Spring Boot                          | 3.4.4   |
| Security        | Spring Security + jjwt               | 0.12.6  |
| ORM             | Spring Data JPA / Hibernate          | 6.6.x   |
| Database        | MySQL (production), H2 (tests)       | 8.0+    |
| API Docs        | Springdoc OpenAPI / Swagger UI       | 2.8.5   |
| Build Tool      | Maven                                | 3.9+    |
| Boilerplate     | Lombok, Jakarta Validation           | —       |
| Email           | Spring Mail via Gmail SMTP           | —       |
| Connection Pool | HikariCP                             | 5.1.0   |

### Frontend

| Component   | Technology                        | Version |
|-------------|-----------------------------------|---------|
| UI Library  | React                             | 18.3.1  |
| Build Tool  | Vite                              | 6.x     |
| Routing     | React Router DOM                  | 6.30.0  |
| HTTP Client | Axios                             | 1.8.4   |
| Styling     | Plain CSS — custom design system  | —       |

---

## Project Structure

```
novabank/
|
+-- backend/                                  Spring Boot Application
|   +-- pom.xml
|   +-- src/
|       +-- main/
|       |   +-- java/com/novabank/banking/
|       |   |   +-- controller/               20 REST controllers
|       |   |   |   +-- AccountController
|       |   |   |   +-- AdminController
|       |   |   |   +-- AdminBroadcastController
|       |   |   |   +-- AdminStaffController
|       |   |   |   +-- AuthController
|       |   |   |   +-- BeneficiaryController
|       |   |   |   +-- BillMandateController
|       |   |   |   +-- ComplaintController
|       |   |   |   +-- CustomerController
|       |   |   |   +-- ExpenseController
|       |   |   |   +-- FdWithdrawalController
|       |   |   |   +-- ForgotPasswordController
|       |   |   |   +-- InsuranceClaimController
|       |   |   |   +-- LoanPrepaymentController
|       |   |   |   +-- LockerRequestController
|       |   |   |   +-- NomineeController
|       |   |   |   +-- ProductRequestController
|       |   |   |   +-- RewardRedemptionController
|       |   |   |   +-- StoppedChequeController
|       |   |   |   +-- TransactionController
|       |   |   |
|       |   |   +-- service/                  Business logic interfaces
|       |   |   |   +-- impl/                 Service implementations
|       |   |   |
|       |   |   +-- repository/               Spring Data JPA repositories
|       |   |   |
|       |   |   +-- entity/                   JPA domain model — 23 entities
|       |   |   |   +-- BankUser              Base user (Admin and Customer extend this)
|       |   |   |   +-- Admin
|       |   |   |   +-- Customer
|       |   |   |   +-- BankAccount           Abstract base (JPA table-per-class)
|       |   |   |   |   +-- SavingsAccount
|       |   |   |   |   +-- TermAccount
|       |   |   |   +-- Transaction
|       |   |   |   +-- Beneficiary
|       |   |   |   +-- Nominee
|       |   |   |   +-- BillMandate
|       |   |   |   +-- Complaint
|       |   |   |   +-- ProductRequest
|       |   |   |   +-- LoanPrepayment
|       |   |   |   +-- InsuranceClaim
|       |   |   |   +-- LockerRequest
|       |   |   |   +-- StoppedCheque
|       |   |   |   +-- RewardRedemption
|       |   |   |   +-- Expense
|       |   |   |   +-- FdWithdrawal
|       |   |   |   +-- AdminBroadcast
|       |   |   |   +-- AdminStaffLog
|       |   |   |   +-- DeletedAccountLog
|       |   |   |   +-- PasswordResetToken
|       |   |   |
|       |   |   +-- dto/                      Request and response record types
|       |   |   +-- enums/                    Role, AccountType, and status enums
|       |   |   +-- security/                 JWT filter, JwtService, UserDetailsService
|       |   |   +-- exception/                Global exception handler and custom exceptions
|       |   |   +-- config/                   SecurityConfig, DataSeeder, DemoDataSeeder
|       |   |   +-- mapper/                   Entity-to-DTO mapping utilities
|       |   |
|       |   +-- resources/
|       |       +-- application.yml
|       |
|       +-- test/
|           +-- java/                         Integration tests using H2
|           +-- resources/
|               +-- application-test.yml
|
+-- frontend/                                 React + Vite Single Page Application
    +-- package.json
    +-- vite.config.js
    +-- src/
        +-- pages/                            40+ route-level page components
        |   |
        |   |   -- Customer Pages --
        |   +-- CustomerDashboardPage
        |   +-- AccountsPage / AccountDetailPage
        |   +-- TransactionsPage / TransferPage
        |   +-- DepositPage / DepositsPage
        |   +-- BeneficiariesPage
        |   +-- BillsPage / LoansPage / CardsPage
        |   +-- InsurancePage / InvestmentsPage
        |   +-- ExpenseTrackerPage / CreditScorePage
        |   +-- RewardsPage / NotificationsPage
        |   +-- ComplaintsPage / KycPage
        |   +-- PassbookChequebookPage / ProfilePage
        |   |
        |   |   -- Admin Pages --
        |   +-- AdminDashboardPage / AdminOverviewPage
        |   +-- AdminCustomersPage / AdminCustomerDetailPage
        |   +-- AdminApprovalsPage / AdminLoansPage
        |   +-- AdminTransactionsPage / AdminReportsPage
        |   +-- AdminComplaintsPage / AdminFollowUpPage
        |   +-- AdminNotificationsPage / AdminStaffPage
        |   +-- AdminProfilePage / AdminSettingsPage
        |   |
        |   |   -- Authentication Pages --
        |   +-- LandingPage / LoginPage / OnboardingPage
        |
        +-- components/                       Shared UI components
        |   +-- AppShell                      Navigation shell and layout wrapper
        |   +-- Breadcrumbs
        |   +-- StatCard / SectionCard
        |   +-- TransactionsTable
        |   +-- GlobalSearch / Toast
        |   +-- ApplicationFormModal
        |   +-- WorkflowModal / ForgotPasswordModal
        |   +-- VirtualKeyboard
        |
        +-- context/
        |   +-- AuthContext.jsx               JWT decode, role detection, login/logout state
        |
        +-- routes/
        |   +-- ProtectedRoute.jsx            Role-based route guard
        |
        +-- services/
        |   +-- api.js                        Centralised Axios instance with auth headers
        |
        +-- styles/
        |   +-- main.css                      Global design system and theme variables
        |
        +-- utils/
            +-- formatters.js                 Currency, date, and number formatters
            +-- fraudDetector.js              Client-side suspicious activity heuristics
            +-- localTransactions.js          Offline-capable transaction helpers
            +-- primaryAccount.js             Primary account resolution logic
            +-- activityLog.js                User activity tracking utilities
            +-- branches.js                   Branch data helpers
            +-- products.js                   Product catalogue definitions
            +-- useAutoRefresh.js             Auto-polling custom hook
```

---

## Prerequisites

Ensure the following tools are installed and accessible from your terminal before proceeding.

| Tool        | Minimum Version | Download                                    |
|-------------|-----------------|---------------------------------------------|
| Java JDK    | 17              | https://adoptium.net                        |
| Maven       | 3.9             | https://maven.apache.org/download.cgi       |
| MySQL       | 8.0             | https://dev.mysql.com/downloads/mysql/      |
| Node.js     | 18              | https://nodejs.org                          |
| npm         | 9               | Bundled with Node.js                        |

Verify each installation before proceeding:

```bash
java -version
mvn -version
mysql --version
node -v
npm -v
```

---

## Setup and Installation

### 1. Database Configuration

Start your MySQL server and ensure it is listening on port `3306`.

Create the application database. This step only needs to be performed once:

```sql
CREATE DATABASE IF NOT EXISTS novabank;
```

> The JDBC connection URL includes `createDatabaseIfNotExist=true`. If your MySQL user has the `CREATE` privilege, the database will be created automatically on the first backend startup. Manually creating it as shown above is recommended for reliability across all environments.

Open `backend/src/main/resources/application.yml` and update the datasource credentials to match your local MySQL configuration:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/novabank?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
    username: root          # Replace with your MySQL username
    password: your_password # Replace with your MySQL password
```

**All database tables are created automatically** by Hibernate on the first backend startup via `ddl-auto: update`. There are no SQL migration scripts to run.

---

### 2. Backend Setup

Navigate to the `backend` directory and start the application:

```bash
cd backend
mvn spring-boot:run
```

Maven resolves and downloads all dependencies on the first run. This requires an active internet connection. Once startup completes successfully, you will see output similar to:

```
Started InternetBankingBackendApplication in 8.312 seconds
```

The backend is then accessible at the following addresses:

| Resource      | URL                                       |
|---------------|-------------------------------------------|
| Swagger UI    | `http://localhost:9098/swagger-ui.html`   |

**Demo data is seeded automatically.** On every startup, the `DemoDataSeeder` component inserts three pre-approved customer accounts along with associated transactions, bill mandates, expenses, and product requests — but only if the data does not already exist. It is safe to restart the application repeatedly without creating duplicate records.

To build a standalone executable JAR:

```bash
cd backend
mvn clean package -DskipTests
java -jar target/backend-1.0.0.jar
```

---

### 3. Frontend Setup

Open a second terminal window and navigate to the `frontend` directory:

```bash
cd frontend
npm install
npm run dev
```

The development server starts at:

```
http://localhost:5173
```

All API requests from the frontend are directed to `http://localhost:9098`. **The backend must be running before you attempt to log in.**

---

## Demo Credentials

All accounts listed below are seeded automatically on the first backend startup. No manual registration is required.

### Administrator Account — DemoDataSeeder

| Field    | Value        |
|----------|--------------|
| Username | `demo_admin` |
| Password | `Admin@123`  |
| Role     | ADMIN        |

### Customer Accounts — DemoDataSeeder

| Full Name     | Username      | Password   | Starting Balance | Status       |
|---------------|---------------|------------|------------------|--------------|
| Alice Sharma  | `demo_alice`  | `Demo@123` | Rs. 1,85,000     | Pre-approved |
| Bob Mehta     | `demo_bob`    | `Demo@123` | Rs. 75,000       | Pre-approved |
| Carol Nair    | `demo_carol`  | `Demo@123` | Rs. 2,40,000     | Pre-approved |


> **Security Notice:** The `DemoDataSeeder` and `DataSeeder` classes are intended strictly for local development. They must be disabled or removed before deploying to any non-local environment. These credentials must not be used in production.

---

## API Reference

The full interactive API documentation is available via Swagger UI at:

```
http://localhost:9098/swagger-ui.html
```

### Authentication

All endpoints except those under `/api/v1/auth/**` require a valid Bearer token in the `Authorization` header.

Obtaining a token:

```
POST /api/v1/auth/login

Request body:
{
  "username": "demo_alice",
  "password": "Demo@123",
  "role": "CUSTOMER"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "role": "CUSTOMER",
  ...
}
```

Using the token in subsequent requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

Authenticating in Swagger UI:

1. Call `POST /api/v1/auth/login` to obtain a token.
2. Copy the value of the `token` field from the response.
3. Click the **Authorize** button at the top of the Swagger UI page.
4. Enter `Bearer <your-token>` in the value field and click **Authorize**.
5. All subsequent requests made through Swagger UI will include the token automatically.

### Endpoint Summary

| Module            | Base Path                     | Description                                       |
|-------------------|-------------------------------|---------------------------------------------------|
| Authentication    | `/api/v1/auth`                | Login, registration, forgot password              |
| Customer          | `/api/v1/customer`            | Profile management, password change, onboarding   |
| Account           | `/api/v1/accounts`            | Account CRUD, deposit, withdrawal, transfer       |
| Transaction       | `/api/v1/transactions`        | History, filtering, date-range reports            |
| Beneficiary       | `/api/v1/beneficiaries`       | Add, update, and remove beneficiaries             |
| Nominee           | `/api/v1/nominees`            | Add, update, and remove nominees                  |
| Bill Mandate      | `/api/v1/bills`               | Register bills, toggle autopay, payment history   |
| Complaint         | `/api/v1/complaints`          | Submit and track customer complaints              |
| Product Request   | `/api/v1/products`            | Apply for loans, cards, insurance, deposits, etc. |
| Loan Prepayment   | `/api/v1/loan-prepayments`    | Submit early loan repayment requests              |
| Insurance Claim   | `/api/v1/insurance-claims`    | Submit and track insurance claims                 |
| Locker Request    | `/api/v1/lockers`             | Request and manage bank lockers                   |
| Stopped Cheque    | `/api/v1/stopped-cheques`     | Request a cheque stop by cheque number            |
| FD Withdrawal     | `/api/v1/fd-withdrawals`      | Request early fixed deposit withdrawals           |
| Reward Redemption | `/api/v1/rewards`             | Redeem loyalty points for cashback or vouchers    |
| Expense           | `/api/v1/expenses`            | Log and categorise personal expenses              |
| Admin             | `/api/v1/admin`               | Customer management, approvals, account control   |
| Admin Broadcast   | `/api/v1/broadcasts`          | Create and manage system-wide announcements       |
| Admin Staff       | `/api/v1/staff`               | Staff account creation, updates, audit log        |

---

## Feature Reference

### Authentication and Security

- Stateless JWT authentication with a 24-hour token expiry.
- Role-based access control enforced at the method level via `@PreAuthorize` with `ADMIN` and `CUSTOMER` roles.
- BCrypt password hashing is applied to all stored credentials. Passwords are never stored or logged in plain text.
- A simulated 6-digit OTP is generated on login and for sensitive transactions to demonstrate two-factor authentication flows. No external SMS gateway is required.
- Account lock and disable states are evaluated on every authenticated request.
- Global CORS policy restricts cross-origin requests to `localhost` origins.
- Centralised exception handling returns consistent `ApiErrorResponse` response bodies across all endpoints.

### Customer Onboarding

- Self-registration generates a unique account number, user ID, and temporary password upon submission.
- New applications are placed in `PENDING` status. The customer cannot log in until an administrator approves the application.
- Supported account types at registration: `SAVINGS`, `STUDENT`, `RURAL`, `SENIOR_CITIZEN`, `WOMEN`, `TERM` (fixed deposit).
- Approval activates both the customer profile and their initial account within a single database transaction.
- Rejection records the administrator's reason and marks the user as inactive.

### Account Management

- A customer may hold multiple accounts of different types simultaneously.
- **Deposits** — Credit any active savings account.
- **Withdrawals** — Minimum balance rules are enforced per account type.
- **Transfers** — Supports `NEFT`, `IMPS`, `RTGS`, and internal same-bank transfers.
  - Transfer charges are calculated automatically based on the mode and amount tier.
  - RTGS minimum: Rs. 2,00,000. IMPS maximum: Rs. 5,00,000.
  - The destination account is credited automatically when it belongs to the same bank.
- **Account lookup** — Any active account can be verified by account number without requiring ownership.
- **Account closure** — Permitted only when the account balance is zero.
- **Admin-initiated deletion** — Supports optional balance transfer to another account before deletion. A full audit log entry is preserved.

### Transactions

- Transaction history is filterable by account number and date range, defaulting to the last 30 days.
- Administrators have a bank-wide view of all transactions.
- Supported transaction types: `DEPOSIT`, `WITHDRAWAL`, `TRANSFER_IN`, `TRANSFER_OUT`, `NEFT`, `IMPS`, `RTGS`, `INTEREST_CREDIT`, `ACCOUNT_OPENING`, `REWARD_CASHBACK`.

### Beneficiaries and Nominees

- Customers can add, update, and remove beneficiaries tied to a specific account.
- Duplicate beneficiary and self-account validation is enforced on the server.
- Nominees are stored per account with name, relationship, government ID type, and phone number.

### Bill Mandates

- Customers can register recurring bills such as electricity, water, gas, mobile, and broadband.
- Autopay can be toggled per bill independently.
- Payment history is recorded per mandate (up to 12 entries stored as a JSON array).
- Administrators can view all mandates across all customers.

### Product Requests

- A unified application workflow handles requests for loans, credit cards, debit cards, insurance, fixed deposits, lockers, and other products.
- Duplicate pending requests for the same product are prevented through idempotent submission logic.
- Administrators can approve, decline, or block and unblock approved products.
- Approving an account-type product (such as a fixed deposit or student account) automatically opens the corresponding bank account for the customer.

### Loan Prepayments

- Customers can submit early loan repayment requests against a loan reference number.
- A unique, auto-incremented reference number is assigned to each prepayment request.
- Administrators process requests via a status update workflow.

### Insurance Claims

- Claims are submitted with policy number, claim type, amount, incident date, and description.
- A unique claim reference is generated on submission.
- Administrators update the claim status to `PENDING`, `APPROVED`, or `REJECTED`.

### Locker Requests and Stopped Cheques

- Customers can request a bank locker by specifying a preferred branch and size.
- Administrators assign a locker number or decline the request with an explanatory note.
- Cheque stop requests are submitted with the cheque number and reason. Duplicate requests for the same cheque number are prevented.

### Reward Redemptions

- Loyalty points can be redeemed as cashback, credited directly to the customer's primary active savings account, or as vouchers.
- Administrators have a full view of all redemption records and can query total points redeemed.

### Expense Tracker

- Customers can log personal expenses with a category (food, transport, shopping, utilities, etc.), amount, and date.
- Monthly summaries with per-category breakdowns are available. CSV import is supported.

### Credit Score

- A simulated credit score is displayed with contributing factor breakdowns.
- Score bands — Excellent, Good, Fair, and Poor — are displayed with contextual improvement recommendations.

### Notifications

- Customers receive in-app notifications for suspicious transactions, reward credits, application status changes, large incoming credits, and bill activity.
- Notifications are prioritised by severity (`high` or `info`) and grouped by type.

### Admin Staff Management

- Administrators can create, update, and soft-delete staff and employee accounts.
- Every staff change is recorded in an audit log with a timestamp and the identity of the administrator who performed the action.

### Admin Dashboard and Reports

- Live dashboard metrics include: pending application count, active customers, active accounts, total deposits, and today's transfer volume.
- A recent transactions feed shows the last 10 transactions bank-wide.
- A built-in interest calculator supports both savings and term account types.
- Transaction reports for any specified date range can be generated, showing total credits and debits. These can be exported.
- A deleted account log preserves the balance at the time of deletion and any transfer details for audit purposes.

---

## Data Model

The following illustrates the entity hierarchy and primary relationships:

```
BankUser  (base entity — holds username, password, and role)
  |
  +-- Admin
  |
  +-- Customer
        |
        +-- BankAccount  (abstract — JPA table-per-class inheritance)
              |
              +-- SavingsAccount
              |
              +-- TermAccount
                    |
                    +-- Transaction  (many-to-one relationship to BankAccount)

Entities associated with Customer:
  Beneficiary        Nominee            BillMandate
  Complaint          ProductRequest     LoanPrepayment
  InsuranceClaim     LockerRequest      StoppedCheque
  RewardRedemption   Expense            FdWithdrawal

Infrastructure and audit entities:
  AdminBroadcast     AdminStaffLog
  DeletedAccountLog  PasswordResetToken
```

Enumerations used across the data model:

| Enum                | Values                                                                                                                                    |
|---------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| `Role`              | `ADMIN`, `CUSTOMER`                                                                                                                       |
| `AccountType`       | `SAVINGS`, `STUDENT`, `RURAL`, `SENIOR_CITIZEN`, `WOMEN`, `TERM`                                                                         |
| `AccountStatus`     | `ACTIVE`, `INACTIVE`, `CLOSED`                                                                                                            |
| `TransactionType`   | `DEPOSIT`, `WITHDRAWAL`, `TRANSFER_IN`, `TRANSFER_OUT`, `NEFT`, `IMPS`, `RTGS`, `INTEREST_CREDIT`, `ACCOUNT_OPENING`, `REWARD_CASHBACK`  |
| `CustomerStatus`    | `PENDING`, `APPROVED`, `DECLINED`                                                                                                         |
| `ComplaintStatus`   | `OPEN`, `IN_PROGRESS`, `RESOLVED`                                                                                                         |
| `ClaimStatus`       | `PENDING`, `APPROVED`, `REJECTED`                                                                                                         |
| `LockerStatus`      | `PENDING`, `ASSIGNED`, `DECLINED`                                                                                                         |
| `PrepaymentStatus`  | `PENDING`, `PROCESSED`, `REJECTED`                                                                                                        |
| `WithdrawalStatus`  | `PENDING`, `APPROVED`, `REJECTED`                                                                                                         |

---

## Security Design

The following describes the request processing path through the security layer:

```
Incoming HTTP Request
        |
        v
JwtAuthenticationFilter
        |  Extracts the Bearer token from the Authorization header
        |  Validates the token signature and expiry using JwtService
        |  Loads the user principal via CustomUserDetailsService
        v
SecurityContextHolder.setAuthentication(...)
        |
        v
@PreAuthorize("hasRole('ADMIN')")  <-- enforced at each controller method
        |
        v
Controller  -->  Service  -->  Repository  -->  Database
```

Security configuration:

- The JWT signing secret is configured in `application.yml` under `security.jwt.secret`.
- Token expiry is 24 hours, controlled by `security.jwt.expiration-ms: 86400000`.
- All passwords are hashed using BCrypt before storage. The raw password is never persisted or logged.
- Every endpoint except those under `/api/v1/auth/**` requires a valid, non-expired JWT to be present in the `Authorization` header.

---

## Running Tests

The integration test suite uses an H2 in-memory database. A running MySQL instance is not required.

```bash
cd backend
mvn test -DskipTests=false
```

Test reports are written to:

```
backend/target/surefire-reports/
```

The test configuration in `application-test.yml` uses `ddl-auto: create-drop`, which builds a clean schema before each test run and drops it afterwards.

---

## Production Build

### Backend

Build a self-contained executable JAR:

```bash
cd backend
mvn clean package -DskipTests
java -jar target/backend-1.0.0.jar
```

### Frontend

Build an optimised static asset bundle:

```bash
cd frontend
npm run build
```

The compiled output is written to `frontend/dist/`. This directory can be served by any static web server or CDN.

To preview the production build locally before deploying:

```bash
npm run preview
```

---

<div align="center">

Built with Spring Boot 3 and React 18

</div>
