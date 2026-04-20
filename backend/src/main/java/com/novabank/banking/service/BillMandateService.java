package com.novabank.banking.service;

import com.novabank.banking.dto.bill.BillRequest;
import com.novabank.banking.dto.bill.BillResponse;
import com.novabank.banking.dto.bill.PaymentRecordRequest;

import java.util.List;

public interface BillMandateService {
    BillResponse add(String username, BillRequest request);
    List<BillResponse> getMine(String username);
    BillResponse toggleAutopay(Long id, String username);
    BillResponse recordPayment(Long id, String username, PaymentRecordRequest request);
    void delete(Long id, String username);
    List<BillResponse> getAll();
}
