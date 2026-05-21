package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentQuestionDto {
    private Long id;
    private Long assessmentId;
    private String type; // MULTIPLE_CHOICE, SHORT_ANSWER, ESSAY
    private String content;
    private Double score;
    private Integer orderIndex;
    private String metadata; // JSON representation of choices/keywords
}
