package com.novabank.banking.repository;

import com.novabank.banking.entity.FdWithdrawal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FdWithdrawalRepository extends JpaRepository<FdWithdrawal, Long> {
    List<FdWithdrawal> findByCustomerUsernameOrderByWithdrawnAtDesc(String username);
    List<FdWithdrawal> findAllByOrderByWithdrawnAtDesc();
}
