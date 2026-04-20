package com.novabank.banking.service.impl;

import com.novabank.banking.dto.staff.StaffLogResponse;
import com.novabank.banking.dto.staff.StaffRequest;
import com.novabank.banking.dto.staff.StaffResponse;
import com.novabank.banking.entity.Admin;
import com.novabank.banking.entity.AdminStaffLog;
import com.novabank.banking.entity.BankUser;
import com.novabank.banking.enums.Role;
import com.novabank.banking.exception.BusinessException;
import com.novabank.banking.exception.ResourceNotFoundException;
import com.novabank.banking.repository.AdminRepository;
import com.novabank.banking.repository.AdminStaffLogRepository;
import com.novabank.banking.repository.UserRepository;
import com.novabank.banking.service.AdminStaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminStaffServiceImpl implements AdminStaffService {

    private final AdminRepository adminRepo;
    private final UserRepository userRepo;
    private final AdminStaffLogRepository logRepo;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public List<StaffResponse> listAll() {
        return adminRepo.findAll().stream()
                .filter(a -> a.getUser().isActive())
                .map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public StaffResponse findById(Long id) {
        return toResponse(findAdmin(id));
    }

    @Override
    @Transactional
    public StaffResponse create(StaffRequest req, String performedBy) {
        if (req.password() == null || req.password().isBlank()) {
            throw new BusinessException("Password is required when creating a new admin.");
        }
        if (userRepo.existsByUsername(req.username())) {
            throw new BusinessException("Username '" + req.username() + "' is already taken.");
        }
        BankUser user = BankUser.builder()
                .username(req.username())
                .password(passwordEncoder.encode(req.password()))
                .role(Role.ADMIN)
                .active(true)
                .locked(false)
                .build();
        userRepo.save(user);

        Admin admin = Admin.builder()
                .adminName(req.adminName())
                .adminEmailId(req.adminEmailId())
                .adminContact(req.adminContact())
                .user(user)
                .build();
        adminRepo.save(admin);

        auditLog("CREATED", admin, performedBy, "New admin created");
        return toResponse(admin);
    }

    @Override
    @Transactional
    public StaffResponse update(Long id, StaffRequest req, String performedBy) {
        Admin admin = findAdmin(id);
        admin.setAdminName(req.adminName());
        admin.setAdminEmailId(req.adminEmailId());
        admin.setAdminContact(req.adminContact());

        if (req.password() != null && !req.password().isBlank()) {
            admin.getUser().setPassword(passwordEncoder.encode(req.password()));
        }

        auditLog("UPDATED", admin, performedBy, "Admin details updated");
        return toResponse(admin);
    }

    @Override
    @Transactional
    public void delete(Long id, String performedBy) {
        Admin admin = findAdmin(id);
        BankUser user = admin.getUser();
        if (user.getUsername().equals(performedBy)) {
            throw new BusinessException("You cannot delete your own admin account.");
        }
        auditLog("DELETED", admin, performedBy,
                "Admin '" + user.getUsername() + "' deactivated");
        user.setActive(false);
        user.setLocked(true);
        userRepo.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StaffLogResponse> getLogs() {
        return logRepo.findAllByOrderByPerformedAtDesc().stream().map(l -> new StaffLogResponse(
                l.getId(), l.getAction(), l.getTargetAdminId(), l.getTargetAdminName(),
                l.getTargetUsername(), l.getPerformedBy(), l.getDetails(), l.getPerformedAt()
        )).toList();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Admin findAdmin(Long id) {
        return adminRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found with id: " + id));
    }

    private void auditLog(String action, Admin admin, String performedBy, String details) {
        logRepo.save(AdminStaffLog.builder()
                .action(action)
                .targetAdminId(admin.getId())
                .targetAdminName(admin.getAdminName())
                .targetUsername(admin.getUser().getUsername())
                .performedBy(performedBy)
                .details(details)
                .build());
    }

    private StaffResponse toResponse(Admin a) {
        return new StaffResponse(
                a.getId(),
                a.getAdminName(),
                a.getAdminEmailId(),
                a.getAdminContact(),
                a.getUser().getUsername(),
                a.getUser().getRole().name(),
                a.getUser().isActive(),
                a.getUser().getCreatedAt()
        );
    }
}
