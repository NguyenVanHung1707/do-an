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
public class TimetableResponseDto {
    private Long semesterId;
    private String semesterName;
    private Integer weekNumber;
    private String weekType;
    private LocalDate weekStartDate;
    private LocalDate weekEndDate;
    private String timezone;
    private String viewerRole;
    private List<TimetableItemDto> items;
}
