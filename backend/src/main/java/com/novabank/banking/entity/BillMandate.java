package com.novabank.banking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bill_mandates")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillMandate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false, length = 100)
    private String customerUsername;

    @Column(nullable = false, length = 150)
    private String customerName;

    /** bill type key: electricity, water, gas, mobile, etc. */
    @Column(nullable = false, length = 40)
    private String type;

    @Column(nullable = false, length = 100)
    private String nickname;

    /** consumer number / registration ID */
    @Column(nullable = false, length = 150)
    private String identifier;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    /** MONTHLY / QUARTERLY / YEARLY / ONETIME */
    @Column(nullable = false, length = 20)
    private String frequency;

    /** day-of-month (1–31) when bill is due */
    private Integer dueDay;

    @Column(length = 5)
    private String dueTime;

    @Column(nullable = false)
    private boolean autopay;

    @Column(nullable = false, length = 30)
    private String fromAccount;

    private LocalDateTime lastPaid;

    /** JSON array of {date, amount} payment history entries — max 12 */
    @Column(columnDefinition = "TEXT")
    private String historyJson;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
