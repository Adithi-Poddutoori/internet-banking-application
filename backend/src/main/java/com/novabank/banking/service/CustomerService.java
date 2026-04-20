package com.novabank.banking.service;

import com.novabank.banking.dto.account.AccountResponse;
import com.novabank.banking.dto.account.OpenAccountRequest;
import com.novabank.banking.dto.auth.CustomerRegistrationResponse;
import com.novabank.banking.dto.auth.RegisterCustomerRequest;
import com.novabank.banking.dto.customer.AdminUpdateCustomerRequest;
import com.novabank.banking.dto.customer.CustomerDashboardResponse;
import com.novabank.banking.dto.customer.CustomerProfileResponse;
import com.novabank.banking.dto.customer.CustomerResponse;
import com.novabank.banking.dto.customer.UpdateCustomerRequest;

import java.math.BigDecimal;
import java.util.List;

public interface CustomerService {

    CustomerRegistrationResponse registerCustomerApplication(RegisterCustomerRequest request);

    CustomerDashboardResponse getDashboard(String username);

    CustomerResponse getProfile(String username);

    CustomerProfileResponse getFullProfile(String username);

    CustomerResponse updateProfile(String username, UpdateCustomerRequest request);

    CustomerResponse adminUpdateCustomer(Long customerId, AdminUpdateCustomerRequest request);

    AccountResponse openNewAccount(String username, OpenAccountRequest request);

    List<CustomerResponse> listAllCustomers(BigDecimal minBalance);

    CustomerResponse findCustomerById(Long customerId);

    CustomerResponse viewCustomerDetailsByAccount(String accountNumber);
}
