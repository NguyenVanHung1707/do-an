package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CourseScheduleDto {
    private Long id;
    private Long courseId;
    private Integer dayOfWeek; // 1: Monday, ..., 7: Sunday
    private LocalTime startTime;
    private LocalTime endTime;
    private String roomName;
}
