package com.novabank.banking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "stopped_cheques")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoppedCheque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String chequeNo;

    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false, length = 100)
    private String customerUsername;

    @Column(nullable = false, length = 150)
    private String customerName;

    @Column(length = 500)
    private String reason;

    @Column(nullable = false, length = 20, columnDefinition = "VARCHAR(20) NOT NULL DEFAULT 'PENDING'")
    @Builder.Default
    private String status = "PENDING"; // PENDING | APPROVED | DECLINED

    @Column(length = 500)
    private String adminNote;

    @Column
    private LocalDateTime decidedAt;

    @Column(nullable = false)
    private LocalDateTime stoppedAt;
}
