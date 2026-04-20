package com.novabank.banking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "term_accounts")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class TermAccount extends BankAccount {

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal principalAmount;

    @Column(nullable = false)
    private Integer termMonths;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal penaltyAmount;

    @Column(nullable = false)
    private LocalDate maturityDate;
}
