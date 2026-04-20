package com.novabank.banking.entity;

import com.novabank.banking.enums.GovtIdType;
import com.novabank.banking.enums.Relation;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "nominees")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Nominee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 32)
    private String govtId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private GovtIdType govtIdType;

    @Column(nullable = false, length = 20)
    private String phoneNo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Relation relation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private BankAccount bankAccount;
}
