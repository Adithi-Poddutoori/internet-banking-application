package com.novabank.banking.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_staff_logs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminStaffLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String action; // CREATED, UPDATED, DELETED

    @Column(nullable = false)
    private Long targetAdminId;

    @Column(nullable = false, length = 80)
    private String targetAdminName;

    @Column(nullable = false, length = 40)
    private String targetUsername;

    @Column(nullable = false, length = 40)
    private String performedBy; // username of admin who did the action

    @Column(length = 200)
    private String details;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime performedAt;
}
