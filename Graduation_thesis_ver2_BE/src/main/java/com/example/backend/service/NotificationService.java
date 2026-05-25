package com.example.backend.service;

import com.example.backend.entity.Student;
import com.example.backend.entity.Teacher;
import com.example.backend.entity.UserDeviceToken;
import com.example.backend.repository.StudentRepository;
import com.example.backend.repository.TeacherRepository;
import com.example.backend.repository.UserDeviceTokenRepository;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.logging.Logger;

@Service
public class NotificationService {

    private static final Logger log = Logger.getLogger(NotificationService.class.getName());

    private final UserDeviceTokenRepository userDeviceTokenRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private boolean firebaseInitialized = false;

    public NotificationService(
            UserDeviceTokenRepository userDeviceTokenRepository,
            StudentRepository studentRepository,
            TeacherRepository teacherRepository) {
        this.userDeviceTokenRepository = userDeviceTokenRepository;
        this.studentRepository = studentRepository;
        this.teacherRepository = teacherRepository;
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

    @Transactional
    public void registerToken(String keycloakId, String token, String deviceType) {
        registerToken(keycloakId, token, deviceType, null);
    }

    @Transactional
    public void registerToken(String keycloakId, String token, String deviceType, String deviceId) {
        if (token == null || token.trim().isEmpty()) {
            return;
        }
        ResolvedUser resolvedUser = resolveUser(keycloakId);
        String normalizedDeviceType = normalizeDeviceType(deviceType);

        Optional<UserDeviceToken> existing = userDeviceTokenRepository.findByFcmToken(token);
        if (existing.isPresent()) {
            UserDeviceToken dt = existing.get();
            dt.setKeycloakId(keycloakId);
            dt.setUserId(resolvedUser.userId());
            dt.setUserType(resolvedUser.userType());
            dt.setDeviceType(normalizedDeviceType);
            dt.setDeviceId(deviceId);
            userDeviceTokenRepository.save(dt);
            log.info("Updated existing DeviceToken for user: " + keycloakId);
        } else {
            UserDeviceToken dt = new UserDeviceToken();
            dt.setKeycloakId(keycloakId);
            dt.setUserId(resolvedUser.userId());
            dt.setUserType(resolvedUser.userType());
            dt.setFcmToken(token);
            dt.setDeviceType(normalizedDeviceType);
            dt.setDeviceId(deviceId);
            userDeviceTokenRepository.save(dt);
            log.info("Registered new DeviceToken for user: " + keycloakId);
        }
    }

    @Transactional
    public void deleteToken(String keycloakId, String token) {
        if (token == null || token.trim().isEmpty()) {
            return;
        }
        userDeviceTokenRepository.deleteByFcmTokenAndKeycloakId(token, keycloakId);
        log.info("Deleted DeviceToken for user: " + keycloakId);
    }

    public void sendPushNotification(String keycloakId, String title, String body) {
        sendPushNotification(keycloakId, title, body, Map.of());
    }

    public void sendPushNotification(String keycloakId, String title, String body, Map<String, String> data) {
        log.info("Preparing to send notification to [" + keycloakId + "]: " + title + " - " + body);
        List<UserDeviceToken> tokens = userDeviceTokenRepository.findByKeycloakId(keycloakId);
        if (tokens.isEmpty()) {
            log.warning("No registered device tokens found for user: " + keycloakId);
            return;
        }

        for (UserDeviceToken dt : tokens) {
            if (firebaseInitialized) {
                try {
                    Message.Builder builder = Message.builder()
                            .setToken(dt.getFcmToken())
                            .setNotification(Notification.builder()
                                    .setTitle(title)
                                    .setBody(body)
                                    .build());
                    if (data != null && !data.isEmpty()) {
                        builder.putAllData(data);
                    }
                    String response = FirebaseMessaging.getInstance().send(builder.build());
                    log.info("Successfully sent message to token " + dt.getFcmToken() + ", response: " + response);
                } catch (Exception e) {
                    log.warning("Failed to send notification via Firebase to token: " + dt.getFcmToken() + ". Error: " + e.getMessage());
                    // Cleanup invalid token if appropriate (unregistered/expired)
                    if (e.getMessage() != null && (e.getMessage().contains("unregistered") || e.getMessage().contains("not-found"))) {
                        userDeviceTokenRepository.delete(dt);
                        log.info("Cleaned up expired token: " + dt.getFcmToken());
                    }
                }
            } else {
                // Fallback Mock Mode: Print notifications
                log.info("[MOCK PUSH] Sent to Device (" + dt.getDeviceType() + "): " + title + " -> " + body);
            }
        }
    }

    private ResolvedUser resolveUser(String keycloakId) {
        Optional<Student> student = studentRepository.findByKeycloakId(keycloakId);
        if (student.isPresent()) {
            return new ResolvedUser(student.get().getId(), "STUDENT");
        }

        Optional<Teacher> teacher = teacherRepository.findByKeycloakId(keycloakId);
        if (teacher.isPresent()) {
            return new ResolvedUser(teacher.get().getId(), "TEACHER");
        }

        throw new IllegalArgumentException("Không tìm thấy người dùng để đăng ký thiết bị.");
    }

    private String normalizeDeviceType(String deviceType) {
        if (deviceType == null || deviceType.isBlank()) {
            return "ANDROID";
        }
        return deviceType.trim().toUpperCase();
    }

    private record ResolvedUser(Long userId, String userType) {
    }
}
