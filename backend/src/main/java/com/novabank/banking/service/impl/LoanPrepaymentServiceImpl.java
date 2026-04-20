package com.novabank.banking.service.impl;

import com.novabank.banking.dto.prepayment.LoanPrepaymentRequest;
import com.novabank.banking.dto.prepayment.LoanPrepaymentResponse;
import com.novabank.banking.entity.Customer;
import com.novabank.banking.entity.LoanPrepayment;
import com.novabank.banking.enums.PrepaymentStatus;
import com.novabank.banking.repository.CustomerRepository;
import com.novabank.banking.repository.LoanPrepaymentRepository;
import com.novabank.banking.service.LoanPrepaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LoanPrepaymentServiceImpl implements LoanPrepaymentService {

    private final LoanPrepaymentRepository repo;
    private final CustomerRepository customerRepository;

    @Override
    public LoanPrepaymentResponse submit(String username, LoanPrepaymentRequest req) {
        Customer c = customerRepository.findByUserUsername(username)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        String ref = "PRE-" + System.currentTimeMillis() % 1_000_000;
        LoanPrepayment p = LoanPrepayment.builder()
                .customerId(c.getId())
                .customerUsername(username)
                .customerName(c.getCustomerName())
                .loanTitle(req.loanTitle())
                .loanRef(req.loanRef())
                .amount(req.amount())
                .accountNumber(req.accountNumber())
                .ref(ref)
                .status(PrepaymentStatus.PENDING)
                .appliedOn(LocalDateTime.now())
                .build();
        return toResponse(repo.save(p));
    }

    @Override
    public List<LoanPrepaymentResponse> getMine(String username) {
        return repo.findByCustomerUsernameOrderByAppliedOnDesc(username)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<LoanPrepaymentResponse> getAll() {
        return repo.findAllByOrderByAppliedOnDesc().stream().map(this::toResponse).toList();
    }

    @Override
    public LoanPrepaymentResponse updateStatus(Long id, String status) {
        LoanPrepayment p = repo.findById(id).orElseThrow(() -> new RuntimeException("Prepayment not found"));
        p.setStatus(PrepaymentStatus.valueOf(status.toUpperCase()));
        p.setDecidedAt(LocalDateTime.now());
        return toResponse(repo.save(p));
    }

    private LoanPrepaymentResponse toResponse(LoanPrepayment p) {
        return new LoanPrepaymentResponse(
                p.getId(), p.getCustomerUsername(), p.getCustomerName(),
                p.getLoanTitle(), p.getLoanRef(), p.getAmount(),
                p.getAccountNumber(), p.getRef(), p.getStatus().name(),
                p.getAppliedOn(), p.getDecidedAt()
        );
    }
}
