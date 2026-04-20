package com.novabank.banking.service;

import com.novabank.banking.dto.withdrawal.FdWithdrawalRequest;
import com.novabank.banking.dto.withdrawal.FdWithdrawalResponse;

import java.util.List;

public interface FdWithdrawalService {
    FdWithdrawalResponse submit(String username, FdWithdrawalRequest request);
    List<FdWithdrawalResponse> getMine(String username);
    List<FdWithdrawalResponse> getAll();
    FdWithdrawalResponse updateStatus(Long id, String status);
}
