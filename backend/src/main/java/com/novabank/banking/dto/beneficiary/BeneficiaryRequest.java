package com.novabank.banking.dto.beneficiary;

import com.novabank.banking.enums.AccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record BeneficiaryRequest(
        @NotBlank(message = "Beneficiary name is required")
        @Size(min = 3, max = 100, message = "Beneficiary name must be between 3 and 100 characters")
        String beneficiaryName,

        @NotBlank(message = "Beneficiary account number is required")
        String beneficiaryAccountNo,

        @NotBlank(message = "IFSC is required")
        @Size(min = 6, max = 20, message = "IFSC must be between 6 and 20 characters")
        String ifsc,

        @NotBlank(message = "Bank name is required")
        @Size(min = 3, max = 100, message = "Bank name must be between 3 and 100 characters")
        String bankName,

        @NotNull(message = "Account type is required")
        AccountType accountType
) {
}
