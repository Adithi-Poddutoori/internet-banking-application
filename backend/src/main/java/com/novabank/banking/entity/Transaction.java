package com.novabank.banking.entity;

import com.novabank.banking.enums.TransactionStatus;
import com.novabank.banking.enums.TransactionType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 24)
    private String transactionReference;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TransactionType transactionType;

    @Column(nullable = false)
    private LocalDateTime transactionDateAndTime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private BankAccount bankAccount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionStatus transactionStatus;

    @Column(length = 250)
    private String transactionRemarks;

    @Column(length = 20)
    private String counterpartyAccountNumber;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal balanceAfterTransaction;
}
