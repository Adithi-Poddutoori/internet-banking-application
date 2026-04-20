package com.novabank.banking.dto.cheque;

public record StoppedChequeRequest(
        String chequeNo,
        String reason
) {}
