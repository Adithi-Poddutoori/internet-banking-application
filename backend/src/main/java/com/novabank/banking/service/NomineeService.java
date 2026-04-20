package com.novabank.banking.service;

import com.novabank.banking.dto.nominee.NomineeRequest;
import com.novabank.banking.dto.nominee.NomineeResponse;

import java.util.Set;

public interface NomineeService {

    Set<NomineeResponse> listMyNominees(String accountNumber, String username);

    NomineeResponse addNominee(String accountNumber, NomineeRequest request, String username);

    NomineeResponse updateNominee(Long nomineeId, NomineeRequest request, String username);

    void deleteNominee(Long nomineeId, String username);
}
