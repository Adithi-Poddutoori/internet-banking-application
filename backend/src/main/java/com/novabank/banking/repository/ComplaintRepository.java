package com.novabank.banking.repository;

import com.novabank.banking.entity.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    List<Complaint> findByCustomerUsernameOrderByCreatedAtDesc(String username);
    List<Complaint> findAllByOrderByCreatedAtDesc();
}
