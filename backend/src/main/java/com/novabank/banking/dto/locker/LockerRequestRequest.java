package com.novabank.banking.dto.locker;

public record LockerRequestRequest(
        String branch,
        String size
) {}
