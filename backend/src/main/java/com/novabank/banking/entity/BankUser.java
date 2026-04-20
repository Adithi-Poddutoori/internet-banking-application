package com.novabank.banking.entity;

import com.novabank.banking.enums.Role;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "bank_users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BankUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String username;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(nullable = false)
    private boolean active;

    @Column(nullable = false)
    private boolean locked;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @OneToOne(mappedBy = "user", fetch = FetchType.LAZY)
    private Customer customer;

    @OneToOne(mappedBy = "user", fetch = FetchType.LAZY)
    private Admin admin;
}
