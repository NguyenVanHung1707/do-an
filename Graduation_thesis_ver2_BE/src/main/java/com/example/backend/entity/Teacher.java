package com.example.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "teacher")
@AllArgsConstructor
@Getter
@NoArgsConstructor
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Teacher {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "teacher_code", nullable = false)
    private String teacherCode;

    @Column(name = "name")
    private String name;

    @Column(name = "keycloak_id")
    private String keycloakId;

    @Column(name = "email")
    private String email;

    @Column(name = "created_at")
    @CreationTimestamp
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    @UpdateTimestamp
    private OffsetDateTime updatedAt;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "account_status", nullable = false)
    private String accountStatus = "PENDING"; // Trạng thái: PENDING, ACTIVE, REJECTED, SUSPENDED

    @Column(name = "rejection_reason")
    private String rejectionReason;

}