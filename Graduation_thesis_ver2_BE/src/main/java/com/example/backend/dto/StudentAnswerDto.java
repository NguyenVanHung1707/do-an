package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StudentAnswerDto {
    private String code;
    private List<AnswerDto> answers;
    private Double latitude;
    private Double longitude;
}
