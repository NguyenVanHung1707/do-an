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
public class StudentSubmissionDto {
    private Long id;
    private Long assessmentId;
    private String studentId;
    private String studentName;
    private String studentCode;
    private OffsetDateTime startedAt;
    private OffsetDateTime submittedAt;
    private Double finalScore;
    private String status; // IN_PROGRESS, SUBMITTED, GRADED
    private String teacherFeedback;
    private OffsetDateTime gradedAt;
    private OffsetDateTime createdAt;
    private Double studentLatitude;
    private Double studentLongitude;
    private Double calculatedDistance;
    private Boolean isValidLocation;
    private Boolean mockLocationDetected;
    private List<SubmissionAnswerDto> answers;
}
