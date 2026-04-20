package com.novabank.banking.entity;

import com.novabank.banking.enums.CustomerStatus;
import com.novabank.banking.enums.Gender;
import com.novabank.banking.enums.GovtIdType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "customers")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String customerName;

    @Column(nullable = false, unique = true, length = 20)
    private String phoneNo;

    @Column(nullable = false, unique = true, length = 120)
    private String emailId;

    @Column(nullable = false)
    private Integer age;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Gender gender;

    @Column(nullable = false, unique = true, length = 32)
    private String govtId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private GovtIdType govtIdType;

    @Column(nullable = false, length = 180)
    private String addressLine;

    @Column(nullable = false, length = 80)
    private String city;

    @Column(nullable = false, length = 80)
    private String state;

    @Column(nullable = false, length = 12)
    private String postalCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CustomerStatus customerStatus;

    @Column(length = 200)
    private String declineReason;

    @Column
    private LocalDateTime terminationNoticeDate;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private BankUser user;

    @Builder.Default
    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<BankAccount> accounts = new LinkedHashSet<>();
}
