package com.novabank.banking.dto.customer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateCustomerRequest(
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

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^[0-9]{10,15}$", message = "Phone number must be 10 to 15 digits")
        String phoneNo
) {
}
