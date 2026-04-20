package com.novabank.banking.dto.customer;

import com.novabank.banking.dto.account.AccountResponse;
import com.novabank.banking.dto.beneficiary.BeneficiaryResponse;
import com.novabank.banking.dto.nominee.NomineeResponse;
import com.novabank.banking.dto.transaction.TransactionResponse;
import com.novabank.banking.enums.CustomerStatus;

import java.util.List;
import java.util.Set;

public record CustomerDashboardResponse(
        String customerName,
        CustomerStatus status,
        List<AccountResponse> accounts,
        List<TransactionResponse> recentTransactions,
        Set<BeneficiaryResponse> beneficiaries,
        Set<NomineeResponse> nominees
) {
}
