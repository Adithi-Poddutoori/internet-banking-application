package com.novabank.banking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Entity
@Table(name = "savings_accounts")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class SavingsAccount extends BankAccount {

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal minimumBalance;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal penaltyFee;
}
