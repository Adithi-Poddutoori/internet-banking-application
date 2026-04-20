package com.novabank.banking.entity;

import com.novabank.banking.enums.WithdrawalStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "fd_withdrawals")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FdWithdrawal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false, length = 100)
    private String customerUsername;

    @Column(nullable = false, length = 150)
    private String customerName;

    @Column(nullable = false, length = 150)
    private String depositTitle;

    @Column(length = 50)
    private String depositRef;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 30)
    private String accountNumber;

    @Column(nullable = false, unique = true, length = 40)
    private String ref;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WithdrawalStatus status;

    @Column(nullable = false)
    private LocalDateTime withdrawnAt;

    private LocalDateTime decidedAt;
}
