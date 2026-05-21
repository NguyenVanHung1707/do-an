package com.example.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "assessment")
@NoArgsConstructor
@AllArgsConstructor
public class Assessment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @NotNull
    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @NotNull
    @Column(name = "type", nullable = false)
    private String type; // QUIZ, MID_TERM, FINAL_EXAM, ASSIGNMENT

    @Column(name = "max_score")
    private Double maxScore = 10.0;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "deadline")
    private OffsetDateTime deadline;

    @Column(name = "score_release_mode")
    private String scoreReleaseMode = "AUTOMATIC"; // AUTOMATIC, MANUAL

    @Column(name = "is_published")
    private Boolean isPublished = false;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
