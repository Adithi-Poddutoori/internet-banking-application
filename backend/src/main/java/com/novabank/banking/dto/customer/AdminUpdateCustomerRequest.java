package com.novabank.banking.dto.customer;

public record AdminUpdateCustomerRequest(
        String customerName,
        String emailId,
        String phoneNo
) {}
