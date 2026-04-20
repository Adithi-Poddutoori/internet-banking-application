package com.novabank.banking.repository;

import com.novabank.banking.entity.AdminStaffLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdminStaffLogRepository extends JpaRepository<AdminStaffLog, Long> {
    List<AdminStaffLog> findAllByOrderByPerformedAtDesc();
}
