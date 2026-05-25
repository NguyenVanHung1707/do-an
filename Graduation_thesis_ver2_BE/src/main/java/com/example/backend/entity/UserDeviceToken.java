package com.example.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "user_device_token", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_device_token_fcm_token", columnNames = "fcm_token")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserDeviceToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_type", nullable = false, length = 20)
    private String userType;

    @Column(name = "keycloak_id", nullable = false)
    private String keycloakId;

    @Column(name = "fcm_token", nullable = false, length = 2048)
    private String fcmToken;

    @Column(name = "device_type", nullable = false, length = 20)
    private String deviceType;

    @Column(name = "device_id", length = 128)
    private String deviceId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "last_updated", nullable = false)
    private OffsetDateTime lastUpdated;

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        createdAt = now;
        lastUpdated = now;
    }

    @PreUpdate
    protected void onUpdate() {
        lastUpdated = OffsetDateTime.now(ZoneOffset.UTC);
    }
}
