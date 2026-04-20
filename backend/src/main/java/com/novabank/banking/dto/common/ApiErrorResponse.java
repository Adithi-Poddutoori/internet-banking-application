package com.novabank.banking.dto.common;

import lombok.Builder;

import java.time.LocalDateTime;
import java.util.Map;

@Builder
public record ApiErrorResponse(
        LocalDateTime timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> validationErrors
) {
}
