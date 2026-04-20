package com.novabank.banking.dto.beneficiary;

import com.novabank.banking.enums.AccountType;

public record BeneficiaryResponse(
        Long id,
        String beneficiaryName,
        String beneficiaryAccountNo,
        String ifsc,
        String bankName,
        AccountType accountType
) {
}
