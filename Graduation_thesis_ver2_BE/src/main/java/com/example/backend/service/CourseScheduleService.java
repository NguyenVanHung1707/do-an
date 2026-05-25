package com.example.backend.service;

import com.example.backend.dto.CourseScheduleDto;
import com.example.backend.entity.CourseSchedule;

import java.util.List;

public interface CourseScheduleService {
    List<CourseSchedule> setCourseSchedules(Long courseId, List<CourseScheduleDto> schedules);
    List<CourseSchedule> getCourseSchedules(Long courseId);
}
