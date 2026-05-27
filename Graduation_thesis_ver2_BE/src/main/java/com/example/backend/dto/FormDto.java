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
public class FormDto {
    private Long timeOfPeriod;
    private List<QuestionDto> questions;
    private String code;
    private Integer lectureNumber;
    private Double latitude;
    private Double longitude;
    private Boolean isLocationRequired;
    private Integer allowedRadiusMeters;
    private OffsetDateTime expiredAt;
    private Long courseId;
    private String subject;
}
