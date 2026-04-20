package com.novabank.banking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "product_requests")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false, length = 100)
    private String customerUsername;

    @Column(nullable = false, length = 100)
    private String customerName;

    @Column(nullable = false, length = 60)
    private String category;

    @Column(nullable = false, length = 200)
    private String productTitle;

    /** PENDING, APPROVED, DECLINED */
    @Column(nullable = false, length = 20)
    private String status;

    @Column(length = 500)
    private String adminNote;

    @Column(nullable = false)
    private LocalDateTime appliedOn;

    @Column
    private LocalDateTime decidedOn;

    /**
     * Whether this product is currently blocked by admin.
     * true  = blocked (default on submit; stays true if admin declines/blocks).
     * false = active  (set when admin approves; or when admin explicitly unblocks).
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean blocked = true;

    /**
     * JSON-serialised application form data filled by the customer.
     * Stored as a TEXT blob so the admin can review it without needing the customer\'s localStorage.
     */
    @Column(columnDefinition = "TEXT")
    private String formData;
}
