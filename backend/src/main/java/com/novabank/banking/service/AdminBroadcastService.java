package com.novabank.banking.service;

import com.novabank.banking.dto.broadcast.BroadcastRequest;
import com.novabank.banking.dto.broadcast.BroadcastResponse;

import java.util.List;

public interface AdminBroadcastService {
    BroadcastResponse send(String adminUsername, BroadcastRequest request);
    List<BroadcastResponse> getAll();
    List<BroadcastResponse> getForAccount(String accountNumber);
    void delete(Long id);
}
