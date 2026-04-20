package com.novabank.banking.repository;

import com.novabank.banking.entity.ProductRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRequestRepository extends JpaRepository<ProductRequest, Long> {
    List<ProductRequest> findByCustomerUsernameOrderByAppliedOnDesc(String username);
    List<ProductRequest> findByStatusOrderByAppliedOnDesc(String status);
    List<ProductRequest> findAllByOrderByAppliedOnDesc();
    boolean existsByCustomerUsernameAndCategoryAndProductTitleAndStatus(
            String customerUsername, String category, String productTitle, String status);
    /** Latest approved request for a specific product — used for block/unblock */
    Optional<ProductRequest> findTopByCustomerUsernameAndCategoryAndProductTitleAndStatusOrderByDecidedOnDesc(
            String customerUsername, String category, String productTitle, String status);
}
