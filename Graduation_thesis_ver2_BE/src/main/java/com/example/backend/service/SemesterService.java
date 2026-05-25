package com.example.backend.service;

import com.example.backend.dto.SemesterDto;
import com.example.backend.dto.SemesterWeekDto;
import com.example.backend.entity.Semester;
import com.example.backend.entity.SemesterWeek;

import java.util.List;

public interface SemesterService {
    Semester createSemester(SemesterDto dto);
    Semester updateSemester(Long id, SemesterDto dto);
    List<Semester> getAllSemesters();
    Semester getActiveSemester();
    void setActiveSemester(Long id);
    List<SemesterWeek> getSemesterWeeks(Long semesterId);
}
