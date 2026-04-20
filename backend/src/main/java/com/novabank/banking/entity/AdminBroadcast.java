package com.novabank.banking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_broadcasts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminBroadcast {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String sentByUsername;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    /** info / warning / alert / promotional / maintenance */
    @Column(nullable = false, length = 20)
    private String type;

    /** all / specific */
    @Column(nullable = false, length = 10)
    private String target;

    /** account number when target = specific */
    @Column(length = 30)
    private String accountNumber;

    @Column(nullable = false)
    private LocalDateTime sentAt;
}
