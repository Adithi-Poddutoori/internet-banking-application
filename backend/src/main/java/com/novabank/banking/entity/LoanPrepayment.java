package com.novabank.banking.entity;

import com.novabank.banking.enums.PrepaymentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "loan_prepayments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanPrepayment {

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
    private String loanTitle;

    @Column(length = 50)
    private String loanRef;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 30)
    private String accountNumber;

    @Column(nullable = false, unique = true, length = 40)
    private String ref;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PrepaymentStatus status;

    @Column(nullable = false)
    private LocalDateTime appliedOn;

    private LocalDateTime decidedAt;
}
