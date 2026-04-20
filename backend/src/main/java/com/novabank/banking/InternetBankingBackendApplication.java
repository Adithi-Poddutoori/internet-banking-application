package com.novabank.banking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class InternetBankingBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(InternetBankingBackendApplication.class, args);
    }
}
