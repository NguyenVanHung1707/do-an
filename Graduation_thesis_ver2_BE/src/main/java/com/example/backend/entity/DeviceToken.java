package com.example.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "device_token")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class DeviceToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "keycloak_id", nullable = false)
    private String keycloakId;

    @Column(name = "token", nullable = false, length = 512)
    private String token;

    @Column(name = "device_type")
    private String deviceType;

    @Column(name = "created_at")
    @CreationTimestamp
    private OffsetDateTime createdAt;
}
