package com.novabank.banking.service;

import com.novabank.banking.dto.staff.StaffLogResponse;
import com.novabank.banking.dto.staff.StaffRequest;
import com.novabank.banking.dto.staff.StaffResponse;

import java.util.List;

public interface AdminStaffService {
    List<StaffResponse> listAll();
    StaffResponse findById(Long id);
    StaffResponse create(StaffRequest request, String performedBy);
    StaffResponse update(Long id, StaffRequest request, String performedBy);
    void delete(Long id, String performedBy);
    List<StaffLogResponse> getLogs();
}
