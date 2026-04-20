package com.novabank.banking.repository;

import com.novabank.banking.entity.LockerRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LockerRequestRepository extends JpaRepository<LockerRequest, Long> {
    List<LockerRequest> findByCustomerUsernameOrderByRequestedAtDesc(String username);
    List<LockerRequest> findAllByOrderByRequestedAtDesc();
    List<LockerRequest> findByBranchAndStatusAndAssignedLockerNotNull(String branch, com.novabank.banking.enums.LockerStatus status);
}
