package com.novabank.banking.config;

import com.novabank.banking.entity.*;
import com.novabank.banking.enums.*;
import com.novabank.banking.repository.AdminRepository;
import com.novabank.banking.repository.CustomerRepository;
import com.novabank.banking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Configuration
@RequiredArgsConstructor
public class DataSeeder {

    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    CommandLineRunner seedDemoData() {
        return args -> {
            if (adminRepository.count() > 0 || customerRepository.count() > 0) {
                return;
            }

            BankUser adminUser = userRepository.save(BankUser.builder()
                    .username("admin.nova")
                    .password(passwordEncoder.encode("Admin@123"))
                    .role(Role.ADMIN)
                    .active(true)
                    .locked(false)
                    .build());

            adminRepository.save(Admin.builder()
                    .adminName("Elena Rivera")
                    .adminContact("9998887776")
                    .adminEmailId("elena.rivera@novabank.io")
                    .user(adminUser)
                    .build());

            BankUser approvedCustomerUser = userRepository.save(BankUser.builder()
                    .username("NB222333")
                    .password(passwordEncoder.encode("Customer@123"))
                    .role(Role.CUSTOMER)
                    .active(true)
                    .locked(false)
                    .build());

            Customer approvedCustomer = Customer.builder()
                    .customerName("Aarav Mehta")
                    .phoneNo("9876543210")
                    .emailId("aarav.mehta@example.com")
                    .age(29)
                    .gender(Gender.MALE)
                    .govtId("NID784512")
                    .govtIdType(GovtIdType.NATIONAL_ID)
                    .addressLine("18 Palm Residency, Green Avenue")
                    .city("Mumbai")
                    .state("Maharashtra")
                    .postalCode("400001")
                    .customerStatus(CustomerStatus.APPROVED)
                    .user(approvedCustomerUser)
                    .build();

            SavingsAccount savingsAccount = SavingsAccount.builder()
                    .accountNumber("741001000001")
                    .accountType(AccountType.SAVINGS)
                    .balance(new BigDecimal("50000.00"))
                    .interestRate(new BigDecimal("3.50"))
                    .dateOfOpening(LocalDate.now())
                    .accountStatus(AccountStatus.ACTIVE)
                    .customer(approvedCustomer)
                    .minimumBalance(new BigDecimal("1000.00"))
                    .penaltyFee(new BigDecimal("250.00"))
                    .build();

            approvedCustomer.getAccounts().add(savingsAccount);
            customerRepository.save(approvedCustomer);

            BankUser pendingCustomerUser = userRepository.save(BankUser.builder()
                    .username("NB777888")
                    .password(passwordEncoder.encode("Pending@123"))
                    .role(Role.CUSTOMER)
                    .active(false)
                    .locked(false)
                    .build());

            Customer pendingCustomer = Customer.builder()
                    .customerName("Maya Shah")
                    .phoneNo("9123456780")
                    .emailId("maya.shah@example.com")
                    .age(32)
                    .gender(Gender.FEMALE)
                    .govtId("DL553812")
                    .govtIdType(GovtIdType.DRIVING_LICENSE)
                    .addressLine("22 Lake View Apartments")
                    .city("Pune")
                    .state("Maharashtra")
                    .postalCode("411014")
                    .customerStatus(CustomerStatus.PENDING)
                    .user(pendingCustomerUser)
                    .build();

            TermAccount pendingAccount = TermAccount.builder()
                    .accountNumber("741001000777")
                    .accountType(AccountType.TERM)
                    .balance(new BigDecimal("15000.00"))
                    .interestRate(new BigDecimal("6.75"))
                    .dateOfOpening(LocalDate.now().minusDays(2))
                    .accountStatus(AccountStatus.PENDING)
                    .customer(pendingCustomer)
                    .principalAmount(new BigDecimal("15000.00"))
                    .termMonths(12)
                    .penaltyAmount(new BigDecimal("300.00"))
                    .maturityDate(LocalDate.now().plusMonths(12))
                    .build();
            pendingCustomer.getAccounts().add(pendingAccount);
            customerRepository.save(pendingCustomer);
        };
    }

}
