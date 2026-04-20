package com.novabank.banking.entity;

import com.novabank.banking.enums.AccountType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "beneficiaries")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Beneficiary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String beneficiaryName;

    @Column(nullable = false, length = 20)
    private String beneficiaryAccountNo;

    @Column(nullable = false, length = 20)
    private String ifsc;

    @Column(nullable = false, length = 100)
    private String bankName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccountType accountType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private BankAccount bankAccount;
}
