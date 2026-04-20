package com.novabank.banking.service.impl;

import com.novabank.banking.dto.locker.LockerAssignRequest;
import com.novabank.banking.dto.locker.LockerRequestRequest;
import com.novabank.banking.dto.locker.LockerRequestResponse;
import com.novabank.banking.entity.Customer;
import com.novabank.banking.entity.LockerRequest;
import com.novabank.banking.enums.LockerStatus;
import com.novabank.banking.repository.CustomerRepository;
import com.novabank.banking.repository.LockerRequestRepository;
import com.novabank.banking.service.LockerRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LockerRequestServiceImpl implements LockerRequestService {

    private final LockerRequestRepository lockerRepo;
    private final CustomerRepository customerRepo;

    @Override
    public LockerRequestResponse submit(String username, LockerRequestRequest request) {
        Customer customer = customerRepo.findByUserUsername(username)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        LockerRequest lr = LockerRequest.builder()
                .customerId(customer.getId())
                .customerUsername(username)
                .customerName(customer.getCustomerName())
                .branch(request.branch())
                .size(request.size())
                .status(LockerStatus.PENDING)
                .requestedAt(LocalDateTime.now())
                .build();
        return toResponse(lockerRepo.save(lr));
    }

    @Override
    public List<LockerRequestResponse> getMine(String username) {
        return lockerRepo.findByCustomerUsernameOrderByRequestedAtDesc(username)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<LockerRequestResponse> getAll() {
        return lockerRepo.findAllByOrderByRequestedAtDesc()
                .stream().map(this::toResponse).toList();
    }

    @Override
    public LockerRequestResponse assign(Long id, LockerAssignRequest request) {
        LockerRequest lr = lockerRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Locker request not found"));
        lr.setAssignedLocker(request.assignedLocker());
        lr.setAdminNote(request.adminNote());
        lr.setStatus(LockerStatus.ASSIGNED);
        lr.setDecidedAt(LocalDateTime.now());
        return toResponse(lockerRepo.save(lr));
    }

    @Override
    public LockerRequestResponse decline(Long id) {
        LockerRequest lr = lockerRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Locker request not found"));
        lr.setStatus(LockerStatus.DECLINED);
        lr.setDecidedAt(LocalDateTime.now());
        return toResponse(lockerRepo.save(lr));
    }

    private LockerRequestResponse toResponse(LockerRequest lr) {
        return new LockerRequestResponse(
                lr.getId(), lr.getCustomerUsername(), lr.getCustomerName(),
                lr.getBranch(), lr.getSize(), lr.getStatus().name(),
                lr.getAssignedLocker(), lr.getAdminNote(),
                lr.getRequestedAt(), lr.getDecidedAt()
        );
    }
}
