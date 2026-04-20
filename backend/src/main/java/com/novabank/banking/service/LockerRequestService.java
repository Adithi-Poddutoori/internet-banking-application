package com.novabank.banking.service;

import com.novabank.banking.dto.locker.LockerAssignRequest;
import com.novabank.banking.dto.locker.LockerRequestRequest;
import com.novabank.banking.dto.locker.LockerRequestResponse;

import java.util.List;

public interface LockerRequestService {
    LockerRequestResponse submit(String username, LockerRequestRequest request);
    List<LockerRequestResponse> getMine(String username);
    List<LockerRequestResponse> getAll();
    LockerRequestResponse assign(Long id, LockerAssignRequest request);
    LockerRequestResponse decline(Long id);
}
