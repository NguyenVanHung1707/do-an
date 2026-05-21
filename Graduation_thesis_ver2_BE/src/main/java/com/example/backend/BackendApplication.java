package com.example.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendApplication {

    //cd D:\Graduation_thesis_ver2\keycloak-24.0.1
    //start keycloak server: bin\kc.bat start-dev
    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

}
