package com.novabank.banking.dto.common;

public record ApiResponse<T>(String message, T data) {
}
