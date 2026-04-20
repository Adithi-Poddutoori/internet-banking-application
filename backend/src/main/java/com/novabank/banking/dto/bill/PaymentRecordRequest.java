package com.novabank.banking.dto.bill;

/** Sent by frontend when a bill payment is recorded (Pay Now or autopay execution) */
public record PaymentRecordRequest(String historyJson) {}
