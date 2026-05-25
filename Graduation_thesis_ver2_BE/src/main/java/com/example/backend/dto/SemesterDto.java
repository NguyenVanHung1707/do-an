package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SemesterDto {
    private Long id;
    private String code;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean isActive;
    private List<WeekConfigDto> weekConfigs;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeekConfigDto {
        private Integer startWeek;
        private Integer endWeek;
        private String type; // 'STUDY', 'MIDTERM_EXAM', 'FINAL_EXAM', 'HOLIDAY'
    }
}
