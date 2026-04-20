package com.novabank.banking.mapper;

import com.novabank.banking.dto.account.AccountResponse;
import com.novabank.banking.dto.admin.PendingCustomerResponse;
import com.novabank.banking.dto.beneficiary.BeneficiaryResponse;
import com.novabank.banking.dto.customer.CustomerProfileResponse;
import com.novabank.banking.dto.customer.CustomerResponse;
import com.novabank.banking.dto.nominee.NomineeResponse;
import com.novabank.banking.dto.transaction.TransactionResponse;
import com.novabank.banking.entity.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;

public final class BankingMapper {

    private BankingMapper() {
    }

    public static CustomerResponse toCustomerResponse(Customer customer) {
        return new CustomerResponse(
                customer.getId(),
                customer.getCustomerName(),
                customer.getPhoneNo(),
                customer.getEmailId(),
                customer.getAge(),
                customer.getGender(),
                customer.getCustomerStatus(),
                customer.getUser().getUsername(),
                customer.getTerminationNoticeDate(),
                customer.getAccounts() == null ? java.util.List.of() :
                        customer.getAccounts().stream()
                                .map(BankingMapper::toAccountResponse)
                                .toList()
        );
    }

    public static CustomerProfileResponse toCustomerProfileResponse(Customer customer) {
        return new CustomerProfileResponse(
                customer.getId(),
                customer.getCustomerName(),
                customer.getPhoneNo(),
                customer.getEmailId(),
                customer.getAge(),
                customer.getGender(),
                customer.getGovtId(),
                customer.getGovtIdType(),
                customer.getAddressLine(),
                customer.getCity(),
                customer.getState(),
                customer.getPostalCode(),
                customer.getCustomerStatus(),
                customer.getUser().getUsername()
        );
    }

    public static AccountResponse toAccountResponse(BankAccount account) {
        BigDecimal minimumBalance = null;
        BigDecimal penaltyFee = null;
        BigDecimal principalAmount = null;
        Integer termMonths = null;
        BigDecimal penaltyAmount = null;
        BigDecimal estimatedInterest = estimateInterest(account);

        if (account instanceof SavingsAccount savings) {
            minimumBalance = savings.getMinimumBalance();
            penaltyFee = savings.getPenaltyFee();
        }
        if (account instanceof TermAccount termAccount) {
            principalAmount = termAccount.getPrincipalAmount();
            termMonths = termAccount.getTermMonths();
            penaltyAmount = termAccount.getPenaltyAmount();
        }

        return new AccountResponse(
                account.getAccountNumber(),
                account.getAccountType(),
                account.getBalance(),
                account.getInterestRate(),
                account.getAccountStatus().name(),
                account.getDateOfOpening(),
                minimumBalance,
                penaltyFee,
                principalAmount,
                termMonths,
                penaltyAmount,
                estimatedInterest
        );
    }

    public static BeneficiaryResponse toBeneficiaryResponse(Beneficiary beneficiary) {
        return new BeneficiaryResponse(
                beneficiary.getId(),
                beneficiary.getBeneficiaryName(),
                beneficiary.getBeneficiaryAccountNo(),
                beneficiary.getIfsc(),
                beneficiary.getBankName(),
                beneficiary.getAccountType()
        );
    }

    public static NomineeResponse toNomineeResponse(Nominee nominee) {
        return new NomineeResponse(
                nominee.getId(),
                nominee.getName(),
                nominee.getGovtId(),
                nominee.getGovtIdType(),
                nominee.getPhoneNo(),
                nominee.getRelation()
        );
    }

    public static TransactionResponse toTransactionResponse(Transaction transaction) {
        return new TransactionResponse(
                transaction.getId(),
                transaction.getTransactionReference(),
                transaction.getBankAccount().getAccountNumber(),
                transaction.getAmount(),
                transaction.getTransactionType(),
                transaction.getTransactionDateAndTime(),
                transaction.getTransactionStatus(),
                transaction.getTransactionRemarks(),
                transaction.getCounterpartyAccountNumber(),
                transaction.getBalanceAfterTransaction()
        );
    }

    public static PendingCustomerResponse toPendingCustomerResponse(Customer customer) {
        BankAccount account = customer.getAccounts().stream()
                .min(Comparator.comparing(BankAccount::getId))
                .orElse(null);
        return new PendingCustomerResponse(
                customer.getId(),
                customer.getCustomerName(),
                customer.getEmailId(),
                customer.getPhoneNo(),
                account != null ? account.getAccountType() : null,
                account != null ? account.getAccountNumber() : null,
                account != null ? account.getBalance() : BigDecimal.ZERO,
                account != null ? account.getDateOfOpening() : null,
                customer.getCustomerStatus()
        );
    }

    public static BigDecimal estimateInterest(BankAccount account) {
        BigDecimal base = account.getBalance();
        if (account instanceof TermAccount termAccount) {
            base = termAccount.getPrincipalAmount();
            BigDecimal months = BigDecimal.valueOf(termAccount.getTermMonths());
            return base.multiply(account.getInterestRate())
                    .multiply(months)
                    .divide(BigDecimal.valueOf(1200), 2, RoundingMode.HALF_UP);
        }
        return base.multiply(account.getInterestRate())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }
}
