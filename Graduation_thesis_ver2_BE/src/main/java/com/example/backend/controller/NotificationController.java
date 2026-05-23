package com.example.backend.controller;

import com.example.backend.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping("/register-token")
    public ResponseEntity<?> registerToken(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, String> request) {
        try {
            String keycloakId = jwt.getClaimAsString("sub");
            String token = request.get("token");
            String deviceType = request.getOrDefault("deviceType", "android");
            
            notificationService.registerToken(keycloakId, token, deviceType);
            return ResponseEntity.ok(Map.of("message", "Device token registered successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
