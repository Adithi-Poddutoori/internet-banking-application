package com.novabank.banking.repository;

import com.novabank.banking.entity.AdminBroadcast;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AdminBroadcastRepository extends JpaRepository<AdminBroadcast, Long> {
    List<AdminBroadcast> findAllByOrderBySentAtDesc();

    @Query("SELECT b FROM AdminBroadcast b WHERE b.target = 'all' OR (b.target = 'specific' AND b.accountNumber = :accountNumber) ORDER BY b.sentAt DESC")
    List<AdminBroadcast> findForAccount(@Param("accountNumber") String accountNumber);
}
