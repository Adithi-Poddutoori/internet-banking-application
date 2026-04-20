package com.novabank.banking.dto.customer;

import com.novabank.banking.enums.CustomerStatus;
import com.novabank.banking.enums.Gender;
import com.novabank.banking.enums.GovtIdType;

public record CustomerProfileResponse(
        Long id,
        String customerName,
        String phoneNo,
        String emailId,
        Integer age,
        Gender gender,
        String govtId,
        GovtIdType govtIdType,
        String addressLine,
        String city,
        String state,
        String postalCode,
        CustomerStatus status,
        String userId
) {
}
