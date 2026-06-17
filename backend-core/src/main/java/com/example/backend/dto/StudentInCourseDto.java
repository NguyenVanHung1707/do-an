package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StudentInCourseDto {
    private Long id;
    private String studentCode;
    private String name;
    private String courseCode;
    private Integer numberOfAbsent;
    private Integer numberOfPresent;
}
