package com.novabank.banking.dto.admin;

import jakarta.validation.constraints.Size;

public record ApprovalDecisionRequest(
        @Size(max = 200, message = "Remarks cannot exceed 200 characters")
        String remarks
) {
}
