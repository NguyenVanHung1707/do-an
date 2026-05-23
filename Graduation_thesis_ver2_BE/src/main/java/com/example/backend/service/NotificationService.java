package com.example.backend.service;

import com.example.backend.entity.DeviceToken;
import com.example.backend.repository.DeviceTokenRepository;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.logging.Logger;

@Service
public class NotificationService {

    private static final Logger log = Logger.getLogger(NotificationService.class.getName());
    
    private final DeviceTokenRepository deviceTokenRepository;
    private boolean firebaseInitialized = false;

    public NotificationService(DeviceTokenRepository deviceTokenRepository) {
        this.deviceTokenRepository = deviceTokenRepository;
    }

    @PostConstruct
    public void init() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                // Attempt to initialize using default credentials
                try {
                    FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.getApplicationDefault())
                            .build();
                    FirebaseApp.initializeApp(options);
                    firebaseInitialized = true;
                    log.info("Firebase Admin SDK initialized successfully.");
                } catch (Exception inner) {
                    log.warning("Firebase Application Default Credentials not found. Local mock mode enabled: " + inner.getMessage());
                    firebaseInitialized = false;
                }
            } else {
                firebaseInitialized = true;
            }
        } catch (Exception e) {
            log.warning("FCM initialization failed: " + e.getMessage() + ". Continuing in log-only mode.");
            firebaseInitialized = false;
        }
    }

    public void registerToken(String keycloakId, String token, String deviceType) {
        if (token == null || token.trim().isEmpty()) {
            return;
        }
        Optional<DeviceToken> existing = deviceTokenRepository.findByToken(token);
        if (existing.isPresent()) {
            DeviceToken dt = existing.get();
            dt.setKeycloakId(keycloakId);
            dt.setDeviceType(deviceType);
            deviceTokenRepository.save(dt);
            log.info("Updated existing DeviceToken for user: " + keycloakId);
        } else {
            DeviceToken dt = new DeviceToken();
            dt.setKeycloakId(keycloakId);
            dt.setToken(token);
            dt.setDeviceType(deviceType);
            deviceTokenRepository.save(dt);
            log.info("Registered new DeviceToken for user: " + keycloakId);
        }
    }

    public void sendPushNotification(String keycloakId, String title, String body) {
        log.info("Preparing to send notification to [" + keycloakId + "]: " + title + " - " + body);
        List<DeviceToken> tokens = deviceTokenRepository.findByKeycloakId(keycloakId);
        if (tokens.isEmpty()) {
            log.warning("No registered device tokens found for user: " + keycloakId);
            return;
        }

        for (DeviceToken dt : tokens) {
            if (firebaseInitialized) {
                try {
                    Message message = Message.builder()
                            .setToken(dt.getToken())
                            .setNotification(Notification.builder()
                                    .setTitle(title)
                                    .setBody(body)
                                    .build())
                            .build();
                    String response = FirebaseMessaging.getInstance().send(message);
                    log.info("Successfully sent message to token " + dt.getToken() + ", response: " + response);
                } catch (Exception e) {
                    log.warning("Failed to send notification via Firebase to token: " + dt.getToken() + ". Error: " + e.getMessage());
                    // Cleanup invalid token if appropriate (unregistered/expired)
                    if (e.getMessage() != null && (e.getMessage().contains("unregistered") || e.getMessage().contains("not-found"))) {
                        deviceTokenRepository.delete(dt);
                        log.info("Cleaned up expired token: " + dt.getToken());
                    }
                }
            } else {
                // Fallback Mock Mode: Print notifications
                log.info("[MOCK PUSH] Sent to Device (" + dt.getDeviceType() + "): " + title + " -> " + body);
            }
        }
    }
}
