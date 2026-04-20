package com.novabank.banking.entity;

import com.novabank.banking.enums.LockerStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "locker_requests")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LockerRequest {

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
    private String branch;

    @Column(nullable = false, length = 20)
    private String size;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LockerStatus status;

    @Column(length = 10)
    private String assignedLocker;

    @Column(length = 500)
    private String adminNote;

    @Column(nullable = false)
    private LocalDateTime requestedAt;

    private LocalDateTime decidedAt;
}
