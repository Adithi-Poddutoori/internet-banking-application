package com.novabank.banking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "expenses")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false, length = 100)
    private String customerUsername;

    @Column(nullable = false, length = 300)
    private String description;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    /** food / transport / shopping / bills / health / entertainment / education / travel / other */
    @Column(nullable = false, length = 30)
    private String category;

    /** cash / upi / netbanking / card */
    @Column(nullable = false, length = 20)
    private String paymentMode;

    @Column(nullable = false)
    private LocalDate expenseDate;

    /** MANUAL or IMPORTED */
    @Column(nullable = false, length = 10)
    private String source;

    /** original transaction ID when source = IMPORTED */
    @Column(length = 80)
    private String transactionId;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
