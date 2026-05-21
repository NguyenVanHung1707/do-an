package com.example.backend.controller;

import com.example.backend.dto.SignUpDto;
import com.example.backend.dto.SignUpResponseDto;
import com.example.backend.service.KeycloakService;
import jakarta.annotation.security.PermitAll;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class KeycloakController {
    private final KeycloakService keycloakService;

    public KeycloakController(KeycloakService keycloakService) {
        this.keycloakService = keycloakService;
    }

    @PostMapping("/anonymous/sign-up-student")
    public ResponseEntity<SignUpResponseDto> signUpStudent(@RequestBody SignUpDto signUpDto) {
        return ResponseEntity.ok(keycloakService.signUpStudent(signUpDto));
    }
    @PermitAll
    @PostMapping("/anonymous/sign-up-teacher")
    public ResponseEntity<SignUpResponseDto> signUpTeacher(@RequestBody SignUpDto signUpDto) {
        return ResponseEntity.ok(keycloakService.signUpTeacher(signUpDto));
    }
    @GetMapping("/anonymous/swagger")
    public ResponseEntity<String> swagger(@RequestHeader("Authorization") String token) {
        String url = "http://localhost:8080/api/anonymous/swagger-ui.html";
        HttpHeaders headers = new HttpHeaders();
        headers.add("Authorization", "Bearer " + token);
        System.out.printf("Token: %s\n", token);
        return ResponseEntity.status(HttpStatus.SEE_OTHER).headers(headers).build();
    }
}
