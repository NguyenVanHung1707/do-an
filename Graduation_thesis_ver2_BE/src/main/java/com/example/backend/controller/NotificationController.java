package com.example.backend.controller;

import com.example.backend.dto.DeviceTokenRequest;
import com.example.backend.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping("/users/device-token")
    public ResponseEntity<?> registerDeviceToken(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody DeviceTokenRequest request) {
        try {
            String keycloakId = jwt.getClaimAsString("sub");
            notificationService.registerToken(
                    keycloakId,
                    request.resolveToken(),
                    request.getDeviceType(),
                    request.getDeviceId()
            );
            return ResponseEntity.ok(Map.of("message", "Device token registered successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/users/device-token")
    public ResponseEntity<?> deleteDeviceToken(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody DeviceTokenRequest request) {
        try {
            String keycloakId = jwt.getClaimAsString("sub");
            notificationService.deleteToken(keycloakId, request.resolveToken());
            return ResponseEntity.ok(Map.of("message", "Device token deleted successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/notifications/register-token")
    public ResponseEntity<?> registerTokenLegacy(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody Map<String, String> request) {
        try {
            String keycloakId = jwt.getClaimAsString("sub");
            String token = request.getOrDefault("fcmToken", request.get("token"));
            String deviceType = request.getOrDefault("deviceType", "ANDROID");
            String deviceId = request.get("deviceId");

            notificationService.registerToken(keycloakId, token, deviceType, deviceId);
            return ResponseEntity.ok(Map.of("message", "Device token registered successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
