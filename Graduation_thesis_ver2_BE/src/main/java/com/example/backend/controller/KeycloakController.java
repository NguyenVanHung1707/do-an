package com.example.backend.controller;

import com.example.backend.dto.SignUpDto;
import com.example.backend.dto.SignUpResponseDto;
import com.example.backend.service.KeycloakService;
import jakarta.annotation.security.PermitAll;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
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

    @PostMapping("/user/change-password")
    public ResponseEntity<?> changePassword(
            @RequestBody java.util.Map<String, String> payload,
            @AuthenticationPrincipal Jwt jwt) {
        String currentPassword = payload.get("currentPassword");
        String newPassword = payload.get("newPassword");
        
        if (currentPassword == null || currentPassword.trim().isEmpty() ||
            newPassword == null || newPassword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "Mật khẩu hiện tại và mật khẩu mới không được để trống!"));
        }
        
        String username = jwt.getClaimAsString("preferred_username");
        String userId = jwt.getClaimAsString("sub");
        
        try {
            keycloakService.changePassword(userId, username, currentPassword, newPassword);
            return ResponseEntity.ok(java.util.Map.of("message", "Đổi mật khẩu thành công!"));
        } catch (jakarta.ws.rs.NotAuthorizedException e) {
            return ResponseEntity.status(401).body(java.util.Map.of("message", "Mật khẩu hiện tại không chính xác!"));
        } catch (Exception e) {
            if (e.getMessage() != null && (e.getMessage().contains("401") || e.getMessage().contains("Unauthorized"))) {
                return ResponseEntity.status(401).body(java.util.Map.of("message", "Mật khẩu hiện tại không chính xác!"));
            }
            return ResponseEntity.status(500).body(java.util.Map.of("message", "Đổi mật khẩu thất bại: " + e.getMessage()));
        }
    }
}

