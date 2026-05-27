package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentDto {
    private Long id;
    private Long courseId;
    private String title;
    private String description;
    private String type; // QUIZ, MID_TERM, FINAL_EXAM, ASSIGNMENT
    private Double maxScore;
    private Integer durationMinutes;
    private OffsetDateTime deadline;
    private String scoreReleaseMode; // AUTOMATIC, MANUAL
    private Boolean isPublished;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private Boolean isLocationRequired;
    private Integer allowedRadiusMeters;
    private Double teacherLatitude;
    private Double teacherLongitude;
    private List<AssessmentQuestionDto> questions;
    private String submissionStatus; // NOT_STARTED, IN_PROGRESS, SUBMITTED, GRADED
    private Double studentScore;
    private Long submissionId;
}
