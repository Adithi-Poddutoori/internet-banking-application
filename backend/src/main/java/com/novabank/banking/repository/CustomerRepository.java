package com.novabank.banking.repository;

import com.novabank.banking.entity.Customer;
import com.novabank.banking.enums.CustomerStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByUserUsername(String username);

    Optional<Customer> findByEmailId(String emailId);

    @EntityGraph(attributePaths = {"user"})
    Optional<Customer> findByEmailIdIgnoreCase(String emailId);

    List<Customer> findByCustomerStatusOrderByIdDesc(CustomerStatus customerStatus);

    boolean existsByPhoneNo(String phoneNo);

    boolean existsByEmailId(String emailId);

    boolean existsByGovtId(String govtId);

    long countByCustomerStatus(CustomerStatus customerStatus);

    @Query("select distinct c from Customer c join c.accounts a where a.balance >= :minBalance")
    List<Customer> findCustomersByMinimumAccountBalance(BigDecimal minBalance);

    @Query("SELECT DISTINCT c FROM Customer c LEFT JOIN FETCH c.user LEFT JOIN FETCH c.accounts")
    List<Customer> findAllWithAccounts();

    @Query("SELECT DISTINCT c FROM Customer c LEFT JOIN FETCH c.user LEFT JOIN FETCH c.accounts WHERE EXISTS (SELECT a FROM c.accounts a WHERE a.balance >= :minBalance)")
    List<Customer> findAllWithAccountsByMinBalance(@Param("minBalance") BigDecimal minBalance);

    List<Customer> findByTerminationNoticeDateBefore(LocalDateTime cutoff);

    @Query("SELECT DISTINCT c FROM Customer c LEFT JOIN FETCH c.user LEFT JOIN FETCH c.accounts WHERE c.id = :id")
    Optional<Customer> findByIdEager(@Param("id") Long id);

    @Query("SELECT DISTINCT c FROM Customer c LEFT JOIN FETCH c.user LEFT JOIN FETCH c.accounts WHERE c.user.username = :username")
    Optional<Customer> findByUserUsernameEager(@Param("username") String username);
}
