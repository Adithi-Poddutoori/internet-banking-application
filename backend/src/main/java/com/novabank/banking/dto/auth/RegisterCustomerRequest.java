package com.novabank.banking.dto.auth;

import com.novabank.banking.enums.AccountType;
import com.novabank.banking.enums.Gender;
import com.novabank.banking.enums.GovtIdType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record RegisterCustomerRequest(
        @NotBlank(message = "Customer name is required")
        @Size(min = 3, max = 100, message = "Customer name must be between 3 and 100 characters")
        String customerName,

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^[0-9]{10,15}$", message = "Phone number must be 10 to 15 digits")
        String phoneNo,

        @NotBlank(message = "Email is required")
        @Email(message = "Enter a valid email address")
        String emailId,

        @NotNull(message = "Age is required")
        @Min(value = 18, message = "Customer must be at least 18 years old")
        @Max(value = 100, message = "Age must be realistic")
        Integer age,

        @NotNull(message = "Gender is required")
        Gender gender,

        @NotBlank(message = "Government ID is required")
        @Size(min = 6, max = 32, message = "Government ID must be between 6 and 32 characters")
        String govtId,

        @NotNull(message = "Government ID type is required")
        GovtIdType govtIdType,

        @NotBlank(message = "Address is required")
        @Size(min = 8, max = 180, message = "Address must be between 8 and 180 characters")
        String addressLine,

        @NotBlank(message = "City is required")
        @Size(min = 2, max = 80, message = "City must be between 2 and 80 characters")
        String city,

        @NotBlank(message = "State is required")
        @Size(min = 2, max = 80, message = "State must be between 2 and 80 characters")
        String state,

        @NotBlank(message = "Postal code is required")
        @Pattern(regexp = "^[A-Za-z0-9-]{4,12}$", message = "Postal code must be 4 to 12 characters")
        String postalCode,

        @NotNull(message = "Requested account type is required")
        AccountType requestedAccountType,

        @NotNull(message = "Opening deposit is required")
        @DecimalMin(value = "1000.00", message = "Opening deposit must be at least 1000.00")
        BigDecimal openingDeposit,

        @Min(value = 3, message = "Term account duration must be at least 3 months")
        @Max(value = 120, message = "Term account duration must be 120 months or fewer")
        Integer termMonths
) {
}
