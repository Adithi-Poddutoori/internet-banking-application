package com.novabank.banking.repository;

import com.novabank.banking.entity.RewardRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RewardRedemptionRepository extends JpaRepository<RewardRedemption, Long> {
    List<RewardRedemption> findByCustomerUsernameOrderByRedeemedAtDesc(String username);

    @Query("SELECT COALESCE(SUM(r.points), 0) FROM RewardRedemption r WHERE r.customerUsername = :username")
    int sumPointsByUsername(@Param("username") String username);
}
