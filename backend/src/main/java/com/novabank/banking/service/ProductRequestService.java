package com.novabank.banking.service;

import com.novabank.banking.dto.product.ProductDecisionRequest;
import com.novabank.banking.dto.product.ProductRequestResponse;
import com.novabank.banking.dto.product.ProductRequestSubmit;

import java.util.List;

public interface ProductRequestService {
    ProductRequestResponse submit(String username, ProductRequestSubmit request);
    List<ProductRequestResponse> getMyRequests(String username);
    List<ProductRequestResponse> getAllRequests();
    ProductRequestResponse decide(Long id, ProductDecisionRequest request);
    /** Admin sets blocked flag by username + category + productTitle */
    ProductRequestResponse setBlocked(String customerUsername, String category, String productTitle, boolean blocked);
}
