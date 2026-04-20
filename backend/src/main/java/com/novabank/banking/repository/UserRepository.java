package com.novabank.banking.repository;

import com.novabank.banking.entity.BankUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<BankUser, Long> {

    Optional<BankUser> findByUsername(String username);

    boolean existsByUsername(String username);
}
