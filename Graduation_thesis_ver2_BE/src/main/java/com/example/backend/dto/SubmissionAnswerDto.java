package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionAnswerDto {
    private Long questionId;
    private String selectedChoice;
    private String answerText;
    private Double score;
    private Boolean isCorrect;
    private String teacherComment;
}
