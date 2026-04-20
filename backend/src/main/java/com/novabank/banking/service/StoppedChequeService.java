package com.novabank.banking.service;

import com.novabank.banking.dto.cheque.StoppedChequeRequest;
import com.novabank.banking.dto.cheque.StoppedChequeResponse;

import java.util.List;

public interface StoppedChequeService {
    StoppedChequeResponse stopCheque(String username, StoppedChequeRequest request);
    List<StoppedChequeResponse> getMyCheques(String username);
    List<StoppedChequeResponse> getAllCheques();
    StoppedChequeResponse decide(Long id, String action, String adminNote);
}
