package com.novabank.banking.service.impl;

import com.novabank.banking.dto.complaint.ComplaintRequest;
import com.novabank.banking.dto.complaint.ComplaintResponse;
import com.novabank.banking.dto.complaint.ComplaintStatusUpdateRequest;
import com.novabank.banking.entity.Complaint;
import com.novabank.banking.entity.Customer;
import com.novabank.banking.enums.ComplaintStatus;
import com.novabank.banking.repository.ComplaintRepository;
import com.novabank.banking.repository.CustomerRepository;
import com.novabank.banking.service.ComplaintService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ComplaintServiceImpl implements ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final CustomerRepository customerRepository;

    @Override
    public ComplaintResponse createComplaint(String username, ComplaintRequest request) {
        Customer customer = customerRepository.findByUserUsername(username)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        Complaint complaint = Complaint.builder()
                .customerId(customer.getId())
                .customerUsername(username)
                .customerName(customer.getCustomerName())
                .subject(request.subject())
                .description(request.description())
                .priority(request.priority() != null ? request.priority() : "NORMAL")
                .status(ComplaintStatus.OPEN)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return toResponse(complaintRepository.save(complaint));
    }

    @Override
    public List<ComplaintResponse> getMyComplaints(String username) {
        return complaintRepository.findByCustomerUsernameOrderByCreatedAtDesc(username)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<ComplaintResponse> getAllComplaints() {
        return complaintRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toResponse).toList();
    }

    @Override
    public ComplaintResponse updateComplaintStatus(Long id, ComplaintStatusUpdateRequest request) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
        complaint.setStatus(ComplaintStatus.valueOf(request.status()));
        if (request.adminNote() != null) complaint.setAdminNote(request.adminNote());
        complaint.setUpdatedAt(LocalDateTime.now());
        return toResponse(complaintRepository.save(complaint));
    }

    private ComplaintResponse toResponse(Complaint c) {
        return new ComplaintResponse(
                c.getId(), c.getSubject(), c.getDescription(), c.getPriority(),
                c.getStatus().name(), c.getAdminNote(), c.getCustomerName(),
                c.getCustomerUsername(), c.getCreatedAt(), c.getUpdatedAt()
        );
    }
}
