package com.example.backend.service.implement;

import com.example.backend.dto.CourseScheduleDto;
import com.example.backend.entity.Course;
import com.example.backend.entity.CourseSchedule;
import com.example.backend.repository.CourseRepository;
import com.example.backend.repository.CourseScheduleRepository;
import com.example.backend.service.CourseScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CourseScheduleServiceImplement implements CourseScheduleService {

    private final CourseScheduleRepository courseScheduleRepository;
    private final CourseRepository courseRepository;

    @Override
    @Transactional
    public List<CourseSchedule> setCourseSchedules(Long courseId, List<CourseScheduleDto> schedulesDto) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Khóa học không tồn tại!"));

        // Clean existing schedules
        courseScheduleRepository.deleteByCourseId(courseId);

        if (schedulesDto == null || schedulesDto.isEmpty()) {
            return new ArrayList<>();
        }

        List<CourseSchedule> newSchedules = new ArrayList<>();
        for (CourseScheduleDto dto : schedulesDto) {
            CourseSchedule schedule = new CourseSchedule();
            schedule.setCourse(course);
            schedule.setDayOfWeek(dto.getDayOfWeek());
            schedule.setStartTime(dto.getStartTime());
            schedule.setEndTime(dto.getEndTime());
            schedule.setRoomName(dto.getRoomName());
            newSchedules.add(schedule);
        }

        return courseScheduleRepository.saveAll(newSchedules);
    }

    @Override
    public List<CourseSchedule> getCourseSchedules(Long courseId) {
        return courseScheduleRepository.findByCourseId(courseId);
    }
}
