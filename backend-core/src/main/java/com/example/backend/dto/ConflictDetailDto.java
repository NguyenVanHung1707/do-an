package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ConflictDetailDto {
    private String studentCode;
    private String studentName;
    private String existingSubject;
    private String existingSchedule;
    private String newSubject;
    private String newSchedule;
}
