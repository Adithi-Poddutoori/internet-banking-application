package com.novabank.banking.repository;

import com.novabank.banking.entity.StoppedCheque;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StoppedChequeRepository extends JpaRepository<StoppedCheque, Long> {
    List<StoppedCheque> findByCustomerUsernameOrderByStoppedAtDesc(String username);
    List<StoppedCheque> findAllByOrderByStoppedAtDesc();
    boolean existsByChequeNoAndCustomerUsername(String chequeNo, String username);
}
