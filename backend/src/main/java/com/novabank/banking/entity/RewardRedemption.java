package com.novabank.banking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "reward_redemptions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RewardRedemption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false, length = 100)
    private String customerUsername;

    /** cashback or voucher */
    @Column(nullable = false, length = 20)
    private String mode;

    @Column(nullable = false)
    private Integer points;

    @Column(name = "redemption_value", nullable = false, precision = 15, scale = 2)
    private BigDecimal value;

    /** voucher brand (Amazon, Flipkart, etc.) — null for cashback */
    @Column(length = 80)
    private String brand;

    @Column(length = 50)
    private String voucherCode;

    @Column(nullable = false)
    private LocalDateTime redeemedAt;
}
