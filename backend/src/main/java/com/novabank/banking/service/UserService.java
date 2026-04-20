package com.novabank.banking.service;

import com.novabank.banking.dto.auth.AuthResponse;
import com.novabank.banking.dto.auth.ChangePasswordRequest;
import com.novabank.banking.dto.auth.LoginRequest;
import com.novabank.banking.entity.BankUser;

public interface UserService {

    AuthResponse signIn(LoginRequest request);

    void signOut(String username);

    BankUser findByUsername(String username);

    void changePassword(String username, ChangePasswordRequest request);
}
