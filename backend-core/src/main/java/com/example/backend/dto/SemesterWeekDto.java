package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SemesterWeekDto {
    private Long id;
    private Long semesterId;
    private Integer weekNumber;
    private LocalDate startDate;
    private LocalDate endDate;
    private String weekType;
}
