package com.example.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "form_submission")
@NoArgsConstructor
@AllArgsConstructor
public class FormSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "form_id", nullable = false)
    private Form form;

    @Column(name = "is_correct")
    private Boolean isCorrect;

    @CreationTimestamp
    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;

    @Column(name = "student_latitude")
    private Double studentLatitude;

    @Column(name = "student_longitude")
    private Double studentLongitude;

    @Column(name = "calculated_distance")
    private Double calculatedDistance;

    @Column(name = "is_valid_location")
    private Boolean isValidLocation;

    @Column(name = "mock_location_detected")
    private Boolean mockLocationDetected;

    @Column(name = "is_face_verified")
    private Boolean isFaceVerified;
}
