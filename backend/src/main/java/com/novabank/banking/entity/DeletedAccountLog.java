package com.novabank.banking.entity;

import com.novabank.banking.enums.AccountType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "deleted_account_logs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeletedAccountLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String accountNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AccountType accountType;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal balanceAtDeletion;

    /** Null when balance was zero and no transfer was needed. */
    @Column(length = 20)
    private String transferredToAccountNumber;

    /** Stored as plain Long — not a FK so the log survives customer deletion. */
    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false, length = 100)
    private String customerName;

    @Column(nullable = false)
    private LocalDateTime deletedAt;
}
