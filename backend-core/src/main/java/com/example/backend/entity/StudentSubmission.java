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
@Table(name = "student_submission")
@NoArgsConstructor
@AllArgsConstructor
public class StudentSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "assessment_id", nullable = false)
    private Assessment assessment;

    @NotNull
    @Column(name = "student_id", nullable = false)
    private String studentId; // Keycloak UUID

    @NotNull
    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;

    @Column(name = "final_score")
    private Double finalScore;

    @NotNull
    @Column(name = "status", nullable = false)
    private String status = "IN_PROGRESS"; // IN_PROGRESS, SUBMITTED, GRADED

    @Column(name = "teacher_feedback", columnDefinition = "text")
    private String teacherFeedback;

    @Column(name = "graded_at")
    private OffsetDateTime gradedAt;

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

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
