package com.novabank.banking.service.impl;

import com.novabank.banking.dto.bill.BillRequest;
import com.novabank.banking.dto.bill.BillResponse;
import com.novabank.banking.dto.bill.PaymentRecordRequest;
import com.novabank.banking.entity.BillMandate;
import com.novabank.banking.entity.Customer;
import com.novabank.banking.repository.BillMandateRepository;
import com.novabank.banking.repository.CustomerRepository;
import com.novabank.banking.service.BillMandateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BillMandateServiceImpl implements BillMandateService {

    private final BillMandateRepository repo;
    private final CustomerRepository customerRepository;

    @Override
    public BillResponse add(String username, BillRequest req) {
        Customer c = customerRepository.findByUserUsername(username)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        BillMandate bill = BillMandate.builder()
                .customerId(c.getId())
                .customerUsername(username)
                .customerName(c.getCustomerName())
                .type(req.type())
                .nickname(req.nickname())
                .identifier(req.identifier())
                .amount(req.amount())
                .frequency(req.frequency())
                .dueDay(req.dueDay())
                .dueTime(req.dueTime())
                .autopay(req.autopay())
                .fromAccount(req.fromAccount())
                .historyJson("[]")
                .createdAt(LocalDateTime.now())
                .build();
        return toResponse(repo.save(bill));
    }

    @Override
    public List<BillResponse> getMine(String username) {
        return repo.findByCustomerUsernameOrderByCreatedAtDesc(username)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public BillResponse toggleAutopay(Long id, String username) {
        BillMandate bill = repo.findById(id).orElseThrow(() -> new RuntimeException("Bill not found"));
        validateOwner(bill, username);
        bill.setAutopay(!bill.isAutopay());
        return toResponse(repo.save(bill));
    }

    @Override
    public BillResponse recordPayment(Long id, String username, PaymentRecordRequest request) {
        BillMandate bill = repo.findById(id).orElseThrow(() -> new RuntimeException("Bill not found"));
        validateOwner(bill, username);
        bill.setLastPaid(LocalDateTime.now());
        if (request.historyJson() != null) {
            bill.setHistoryJson(request.historyJson());
        }
        return toResponse(repo.save(bill));
    }

    @Override
    public void delete(Long id, String username) {
        BillMandate bill = repo.findById(id).orElseThrow(() -> new RuntimeException("Bill not found"));
        validateOwner(bill, username);
        repo.delete(bill);
    }

    @Override
    public List<BillResponse> getAll() {
        return repo.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    private void validateOwner(BillMandate bill, String username) {
        if (!bill.getCustomerUsername().equals(username))
            throw new RuntimeException("Access denied");
    }

    private BillResponse toResponse(BillMandate b) {
        return new BillResponse(
                b.getId(), b.getCustomerUsername(), b.getCustomerName(),
                b.getType(), b.getNickname(), b.getIdentifier(), b.getAmount(),
                b.getFrequency(), b.getDueDay(), b.getDueTime(), b.isAutopay(),
                b.getFromAccount(), b.getLastPaid(),
                b.getHistoryJson() != null ? b.getHistoryJson() : "[]",
                b.getCreatedAt()
        );
    }
}
