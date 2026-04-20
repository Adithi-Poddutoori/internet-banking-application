package com.novabank.banking.service;

import com.novabank.banking.dto.reward.RedemptionRequest;
import com.novabank.banking.dto.reward.RedemptionResponse;

import java.util.List;

public interface RewardRedemptionService {
    RedemptionResponse redeem(String username, RedemptionRequest request);
    List<RedemptionResponse> getMine(String username);
    int getTotalRedeemedPoints(String username);
    List<RedemptionResponse> getAll();
}
