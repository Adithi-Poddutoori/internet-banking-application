package com.novabank.banking.dto.nominee;

import com.novabank.banking.enums.GovtIdType;
import com.novabank.banking.enums.Relation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record NomineeRequest(
        @NotBlank(message = "Nominee name is required")
        @Size(min = 3, max = 100, message = "Nominee name must be between 3 and 100 characters")
        String name,

        @NotBlank(message = "Government ID is required")
        @Size(min = 6, max = 32, message = "Government ID must be between 6 and 32 characters")
        String govtId,

        @NotNull(message = "Government ID type is required")
        GovtIdType govtIdType,

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^[0-9]{10,15}$", message = "Phone number must be 10 to 15 digits")
        String phoneNo,

        @NotNull(message = "Relation is required")
        Relation relation
) {
}
