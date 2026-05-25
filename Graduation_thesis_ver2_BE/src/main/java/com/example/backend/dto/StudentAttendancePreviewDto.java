package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StudentAttendancePreviewDto {
    private Long studentId;
    private String studentCode;
    private String name;
    private String currentStatus; // "PRESENT", "ABSENT", "N/A"
    private String proposedStatus; // "PRESENT", "ABSENT"
}
