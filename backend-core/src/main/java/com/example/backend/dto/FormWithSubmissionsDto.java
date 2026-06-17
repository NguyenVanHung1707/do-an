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
public class FormWithSubmissionsDto {
    private Long id;
    private String code;
    private Integer lectureNumber;
    private OffsetDateTime expiredAt;
    private OffsetDateTime createdAt;
    private Double latitude;
    private Double longitude;
    private Boolean isLocationRequired;
    private Integer allowedRadiusMeters;
    private List<QuestionDto> questions;
    private List<StudentInCourseDto> successfulStudents;
}
