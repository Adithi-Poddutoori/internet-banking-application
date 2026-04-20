package com.novabank.banking.repository;

import com.novabank.banking.entity.DeletedAccountLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeletedAccountLogRepository extends JpaRepository<DeletedAccountLog, Long> {
    List<DeletedAccountLog> findByCustomerIdOrderByDeletedAtDesc(Long customerId);
}
