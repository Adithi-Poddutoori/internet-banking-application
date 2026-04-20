package com.novabank.banking.entity;

import com.novabank.banking.enums.ClaimStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "insurance_claims")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InsuranceClaim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String ref;

    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false, length = 100)
    private String customerUsername;

    @Column(nullable = false, length = 150)
    private String customerName;

    @Column(nullable = false, length = 150)
    private String policy;

    @Column(nullable = false, length = 100)
    private String type;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDate incidentDate;

    @Column(length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ClaimStatus status;

    @Column(nullable = false)
    private LocalDateTime submittedAt;

    @Column
    private LocalDateTime updatedAt;
}
