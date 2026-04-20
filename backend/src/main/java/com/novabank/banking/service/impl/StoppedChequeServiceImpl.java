package com.novabank.banking.service.impl;

import com.novabank.banking.dto.cheque.StoppedChequeRequest;
import com.novabank.banking.dto.cheque.StoppedChequeResponse;
import com.novabank.banking.entity.Customer;
import com.novabank.banking.entity.StoppedCheque;
import com.novabank.banking.repository.CustomerRepository;
import com.novabank.banking.repository.StoppedChequeRepository;
import com.novabank.banking.service.StoppedChequeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StoppedChequeServiceImpl implements StoppedChequeService {

    private final StoppedChequeRepository chequeRepository;
    private final CustomerRepository customerRepository;

    @Override
    public StoppedChequeResponse stopCheque(String username, StoppedChequeRequest request) {
        Customer customer = customerRepository.findByUserUsername(username)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        if (chequeRepository.existsByChequeNoAndCustomerUsername(request.chequeNo(), username)) {
            throw new RuntimeException("Cheque #" + request.chequeNo() + " is already stopped.");
        }

        StoppedCheque cheque = StoppedCheque.builder()
                .chequeNo(request.chequeNo())
                .customerId(customer.getId())
                .customerUsername(username)
                .customerName(customer.getCustomerName())
                .reason(request.reason())
                .stoppedAt(LocalDateTime.now())
                .build();

        return toResponse(chequeRepository.save(cheque));
    }

    @Override
    public List<StoppedChequeResponse> getMyCheques(String username) {
        return chequeRepository.findByCustomerUsernameOrderByStoppedAtDesc(username)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<StoppedChequeResponse> getAllCheques() {
        return chequeRepository.findAllByOrderByStoppedAtDesc()
                .stream().map(this::toResponse).toList();
    }

    @Override
    public StoppedChequeResponse decide(Long id, String action, String adminNote) {
        StoppedCheque cheque = chequeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Stopped cheque request not found: " + id));
        cheque.setStatus("approve".equalsIgnoreCase(action) ? "APPROVED" : "DECLINED");
        cheque.setAdminNote(adminNote);
        cheque.setDecidedAt(java.time.LocalDateTime.now());
        return toResponse(chequeRepository.save(cheque));
    }

    private StoppedChequeResponse toResponse(StoppedCheque c) {
        return new StoppedChequeResponse(
                c.getId(), c.getChequeNo(), c.getCustomerUsername(), c.getCustomerName(),
                c.getReason(), c.getStoppedAt(), c.getStatus(), c.getAdminNote(), c.getDecidedAt()
        );
    }
}
