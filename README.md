# NovaBanK — Internet Banking Suite

A full-stack internet banking application built with **Spring Boot 3** and **React 18**. It covers the complete lifecycle of a bank customer: registration, admin approval, account operations, transfers, bills, loans, insurance, complaints, and much more — all secured with JWT and documented via Swagger.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Backend Features](#backend-features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Replication Guide](#replication-guide)
  - [1. Database Setup (MySQL)](#1-database-setup-mysql)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Default Credentials](#default-credentials)
- [API Documentation](#api-documentation)
- [Running Tests](#running-tests)

---

## Tech Stack

| Layer     | Technology                                                   |
|-----------|-----------------------------------------------------------   |
| Backend   | Java 17, Spring Boot 3.4.4, Spring Security, Spring Data JPA |
| Auth      | JWT (jjwt 0.12.6), BCrypt password hashing                   |
| Database  | MySQL 8+ (production), H2 in-memory (tests)                  |
| Docs      | Springdoc OpenAPI / Swagger UI 2.8.5                         |
| Build     | Maven 3.9+                                                   |
| Frontend  | React 18, Vite 6, React Router 6, Axios                      |

---

## Backend Features

### Authentication & Security
- Stateless JWT authentication — tokens expire after 24 hours
- Role-based access control: `ADMIN` and `CUSTOMER` roles enforced via `@PreAuthorize`
- BCrypt password hashing on all stored passwords
- Global CORS policy scoped to `localhost` origins
- Centralized exception handling with structured `ApiErrorResponse` bodies
- Account lock/disable support (`isEnabled`, `isAccountNonLocked` checks on every request)

### Customer Onboarding
- Self-registration endpoint — generates a unique **Account Number**, **User ID**, and **temporary password** on submission
- Simulated 6-digit OTP generated on every login and transaction for 2FA demonstration (no external SMS gateway required)
- Application starts in `PENDING` state; admin must approve or decline before the customer can log in
- Support for multiple account types on registration: `SAVINGS`, `STUDENT`, `RURAL`, `SENIOR_CITIZEN`, `WOMEN`, `TERM` (fixed deposit)
- Approval activates the customer and their initial account in a single transaction
- Decline records the admin's reason and deactivates the user

### Account Management
- Customers can hold multiple accounts of different types
- **Deposits** — credit any active savings account
- **Withdrawals** — enforces minimum balance rules per account type
- **Transfers** — supports `NEFT`, `IMPS`, `RTGS`, and same-bank internal transfers
  - Automatic tiered transfer charges calculated per mode and amount
  - RTGS minimum: ₹2,00,000 · IMPS maximum: ₹5,00,000
  - Receiver credited automatically when the destination account exists in the same bank
- **Account lookup** — verify any active account by number without ownership
- **Account closure** — only permitted when balance is zero
- **Admin account deletion** — with optional balance transfer to another account; full audit log preserved

### Transaction History
- Filterable by account number and date range (defaults to last 30 days)
- Admin view of all transactions across the bank
- Date-range transaction report with total credits and debits summary
- Transaction types: `DEPOSIT`, `WITHDRAWAL`, `TRANSFER_IN`, `TRANSFER_OUT`, `NEFT`, `IMPS`, `RTGS`, `INTEREST_CREDIT`, `ACCOUNT_OPENING`, `REWARD_CASHBACK`

### Beneficiary Management
- Add, update, and remove beneficiaries per account
- Duplicate and self-account validations enforced server-side

### Profile
- Customer can change their password and set any account as primary

### Nominee Management
- Add, update, and remove nominees per account
- Stores name, relationship, government ID type, and phone number

### Bill Mandates
- Register recurring bills (electricity, water, broadband, etc.)
- Toggle autopay on/off per bill
- Record payment history; admin view of all mandates

### Complaints
- Customers submit complaints with subject, description, and priority
- Admins update complaint status (`OPEN`, `IN_PROGRESS`, `RESOLVED`) with optional notes

### Product Requests (Loans, Cards, Insurance, Deposits, etc.)
- Customers apply for any product category through a unified workflow
- Duplicate pending request prevention (idempotent submit)
- Admin can approve, decline, or block/unblock approved products
- Approved account-type requests automatically open the corresponding account
- **Product Control** tab in admin approvals includes a live search bar to filter by product name or customer

### Stopped Cheques
- Customers request a cheque stop by cheque number and reason
- Duplicate cheque stop prevention
- Admin approve or decline with notes

### Loan Prepayments
- Submit early repayment requests against a loan reference
- Auto-incremented reference number; admin processes via status update

### Insurance Claims
- Submit claims with policy, type, amount, incident date, and description
- Unique claim reference generated on submission
- Admin updates claim status (`PENDING`, `APPROVED`, `REJECTED`)

### Locker Requests
- Request a bank locker by branch and size
- Admin assigns a locker number or declines with a note

### Reward Redemptions
- Redeem loyalty points as cashback (credited directly to the customer's primary active savings account) or vouchers
- Admin view and total redeemed points endpoint

### Notifications
- Customers receive notifications for suspicious transactions, rewards, approval status changes, large credits, and bill activity
- Notifications are prioritised by severity (`high`, `info`) and grouped by type

### Admin Broadcasts
- Admins can create system-wide broadcast messages (info, warning, alert, promotional)
- Broadcasts are displayed to customers on their dashboard and notification feed

### Admin Follow-up Queue
- Aggregates all items requiring admin attention: open complaints, pending loan prepayments, insurance claims, locker requests, FD withdrawals, and loan foreclosures
- Items are colour-coded by SLA urgency (overdue, urgent, pending) and sorted automatically

### Expense Tracker
- Customers can log and categorise personal expenses (food, transport, shopping, etc.)
- Monthly summaries with category breakdowns and CSV import support

### Credit Score
- Simulated credit score display with contributing factor breakdown
- Score bands (Excellent / Good / Fair / Poor) with improvement tips

### KYC
- Post-registration KYC summary page confirming submitted identity and address details
- Displays account number, user ID, and temporary password after successful registration

### Admin Staff Management
- Create, update, and soft-delete admin/employee accounts
- Full audit log of staff changes with timestamp and performed-by tracking

### Admin Dashboard & Reports
- Live metrics: pending applications, active customers, active accounts, total deposits, today's transfer volume
- Recent transactions feed (last 10 across the bank)
- Interest calculator for both savings and term accounts
- Exportable transaction report with credit/debit totals for any date range
- Deleted account log with balance-at-deletion and transfer details 
---

## Project Structure

```
internet-banking-suite/
├── backend/                         # Spring Boot application
│   └── src/main/java/com/novabank/banking/
│       ├── controller/              # REST API endpoints (19 controllers)
│       ├── service/ & service/impl/ # Business logic layer
│       ├── repository/              # Spring Data JPA repositories
│       ├── entity/                  # JPA domain model (inheritance: BankAccount → SavingsAccount, TermAccount)
│       ├── dto/                     # Request/response contracts (records)
│       ├── enums/                   # Role, AccountType, TransactionType, etc.
│       ├── security/                # JWT filter, JwtService, CustomUserDetailsService
│       ├── exception/               # Global exception handler, custom exceptions
│       └── config/                  # SecurityConfig, OpenAPIConfig, DataSeeder, DemoDataSeeder
└── frontend/                        # React + Vite application
    └── src/
        ├── pages/                   # 40+ page components (customer & admin)
        ├── components/              # Reusable UI components
        ├── context/                 # AuthContext (JWT decode, role routing)
        ├── services/                # Axios API clients
        ├── routes/                  # Protected route wrappers
        ├── utils/                   # Formatters and helpers
        └── styles/                  # Global and component styles
```

---

## Prerequisites

Make sure the following are installed before starting:

| Tool         | Version     | Download                                      |
|--------------|-------------|-----------------------------------------------|
| Java JDK     | 17 or later | https://adoptium.net                          |
| Maven        | 3.9+        | https://maven.apache.org/download.cgi         |
| MySQL Server | 8.0+        | https://dev.mysql.com/downloads/mysql/        |
| Node.js      | 18+         | https://nodejs.org                            |
| npm          | 9+          | Bundled with Node.js                          |

---

## Replication Guide

### 1. Database Setup (MySQL)

Start your MySQL server and ensure it is running on port `3306`.

Open a MySQL shell (or any GUI like MySQL Workbench) and create the database:

```sql
CREATE DATABASE novabank;
USE novabank;
```

That's it. All tables are **created automatically** by Hibernate when the backend starts for the first time (`ddl-auto: update`). No SQL scripts need to be run manually.

Next, update `backend/src/main/resources/application.yml` with your MySQL credentials:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/novabank?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
    username: root              # ← your MySQL username
    password: your_password     # ← your MySQL password
```

> **Tip:** The JDBC URL includes `createDatabaseIfNotExist=true`, so if your MySQL user has `CREATE` privileges, the database may be created automatically on first run too. However, manually running `CREATE DATABASE novabank` first (as shown above) is the most reliable approach across all environments.

---

### 2. Backend Setup

Navigate to the `backend` directory and start the application:

```bash
cd backend
mvn spring-boot:run
```

Maven will download all dependencies on the first run. Once started, the following URLs are available:

| Resource     | URL                                      |
|--------------|------------------------------------------|
| Swagger UI   | `http://localhost:9098/swagger-ui.html`  |

On startup, a **DataSeeder** automatically inserts demo data (admin + approved customer) if the database is empty. No manual SQL scripts are needed.

To build a standalone JAR instead:

```bash
mvn clean package -DskipTests
java -jar target/backend-1.0.0.jar
```

---

### 3. Frontend Setup

In a separate terminal, navigate to the `frontend` directory:

```bash
cd frontend
npm install
npm run dev
```

The development server starts at:

```
http://localhost:5173
```

> The frontend proxies API requests to `http://localhost:9098`. Ensure the backend is running before logging in.

To build for production:

```bash
npm run build
npm run preview   # optional: preview the production build locally
```

---

## Default Credentials

The seeder creates the following accounts automatically on first run:

| Role     | Username        | Password       | Notes                               |
|----------|-----------------|----------------|------------------------------------ |
| Admin    | `demo_admin`    | `Admin@123`    | Full admin access                   |
| Customer | `demo_alice`    | `Demo@123`     | Pre-approved with a savings account |

> **Security note:** Change these credentials immediately in any non-local environment. Update `DataSeeder.java` or remove the seeder entirely before deploying to production.

---

## API Documentation

The full interactive API reference is available via Swagger UI once the backend is running:

```
http://localhost:9098/swagger-ui.html
```

All endpoints require a `Bearer <token>` header except:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register/customer`

To authenticate in Swagger UI:
1. Call `POST /api/v1/auth/login` with your credentials and `role` (`ADMIN` or `CUSTOMER`)
2. Copy the `token` value from the response
3. Click **Authorize 🔓** at the top of the Swagger page and enter `Bearer <token>`
4. Click **Authorize** → **Close** — all subsequent requests will include the token automatically

---

## Running Tests

The test suite uses an **H2 in-memory database** so no MySQL instance is required.

```bash
cd backend
mvn test -DskipTests=false
```

Test reports are written to `backend/target/surefire-reports/`.
```

## Notes

- The demo backend uses an in-memory **H2** database seeded on startup.
- Term accounts are modeled realistically and shown in dashboards with interest projection.
- Regular self-service money movement is enabled for **active savings accounts** in this build, while term accounts are primarily onboarding and interest products.
- The code is structured so it can be moved easily to MySQL or PostgreSQL.
