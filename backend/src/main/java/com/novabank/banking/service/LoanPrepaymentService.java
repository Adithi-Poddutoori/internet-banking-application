package com.novabank.banking.service;

import com.novabank.banking.dto.prepayment.LoanPrepaymentRequest;
import com.novabank.banking.dto.prepayment.LoanPrepaymentResponse;

import java.util.List;

public interface LoanPrepaymentService {
    LoanPrepaymentResponse submit(String username, LoanPrepaymentRequest request);
    List<LoanPrepaymentResponse> getMine(String username);
    List<LoanPrepaymentResponse> getAll();
    LoanPrepaymentResponse updateStatus(Long id, String status);
}
