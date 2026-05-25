package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TimetableItemDto {
    private Long scheduleId;
    private Long courseId;
    private String courseCode;
    private String subject;
    private String roomName;
    private Integer dayOfWeek;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private String teacherName;
    private String status;
}
