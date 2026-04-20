package com.novabank.banking.service.impl;

import com.novabank.banking.dto.broadcast.BroadcastRequest;
import com.novabank.banking.dto.broadcast.BroadcastResponse;
import com.novabank.banking.entity.AdminBroadcast;
import com.novabank.banking.repository.AdminBroadcastRepository;
import com.novabank.banking.service.AdminBroadcastService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminBroadcastServiceImpl implements AdminBroadcastService {

    private final AdminBroadcastRepository repo;

    @Override
    public BroadcastResponse send(String adminUsername, BroadcastRequest req) {
        AdminBroadcast b = AdminBroadcast.builder()
                .sentByUsername(adminUsername)
                .title(req.title())
                .message(req.message())
                .type(req.type() != null ? req.type() : "info")
                .target(req.target() != null ? req.target() : "all")
                .accountNumber(req.accountNumber())
                .sentAt(LocalDateTime.now())
                .build();
        return toResponse(repo.save(b));
    }

    @Override
    public List<BroadcastResponse> getAll() {
        return repo.findAllByOrderBySentAtDesc().stream().map(this::toResponse).toList();
    }

    @Override
    public List<BroadcastResponse> getForAccount(String accountNumber) {
        return repo.findForAccount(accountNumber).stream().map(this::toResponse).toList();
    }

    @Override
    public void delete(Long id) {
        repo.findById(id).ifPresent(repo::delete);
    }

    private BroadcastResponse toResponse(AdminBroadcast b) {
        return new BroadcastResponse(
                b.getId(), b.getSentByUsername(), b.getTitle(), b.getMessage(),
                b.getType(), b.getTarget(), b.getAccountNumber(), b.getSentAt()
        );
    }
}
