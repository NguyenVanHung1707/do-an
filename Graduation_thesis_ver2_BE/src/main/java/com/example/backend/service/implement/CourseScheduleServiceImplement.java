package com.example.backend.service.implement;

import com.example.backend.dto.ConflictDetailDto;
import com.example.backend.dto.CourseScheduleDto;
import com.example.backend.entity.Course;
import com.example.backend.entity.CourseSchedule;
import com.example.backend.exception.ScheduleConflictException;
import com.example.backend.repository.CourseRepository;
import com.example.backend.repository.CourseScheduleRepository;
import com.example.backend.service.CourseScheduleService;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CourseScheduleServiceImplement implements CourseScheduleService {

    private final CourseScheduleRepository courseScheduleRepository;
    private final CourseRepository courseRepository;

    @Override
    @Transactional
    public List<CourseSchedule> setCourseSchedules(Long courseId, List<CourseScheduleDto> schedulesDto) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));

        if (course.getSemester() == null) {
            throw new IllegalArgumentException("Course has not been assigned to a semester");
        }

        Long semesterId = course.getSemester().getId();
        Long teacherId = course.getTeacher().getId();

        if (schedulesDto != null && !schedulesDto.isEmpty()) {
            for (CourseScheduleDto dto : schedulesDto) {
                List<CourseSchedule> overlaps = courseScheduleRepository.findOverlappingTeacherSchedules(
                        semesterId,
                        teacherId,
                        dto.getDayOfWeek(),
                        dto.getStartTime(),
                        dto.getEndTime(),
                        courseId
                );

                if (!overlaps.isEmpty()) {
                    CourseSchedule conflict = overlaps.get(0);
                    String dayName = getDayOfWeekName(dto.getDayOfWeek());
                    ConflictDetailDto detail = new ConflictDetailDto(
                            null,
                            null,
                            conflict.getCourse().getSubject(),
                            formatSchedule(dayName, conflict.getStartTime(), conflict.getEndTime()),
                            course.getSubject(),
                            formatSchedule(dayName, dto.getStartTime(), dto.getEndTime())
                    );

                    throw new ScheduleConflictException(
                            String.format(
                                  "Trùng lịch dạy: %s trùng với lớp '%s'.",
                                    detail.getNewSchedule(),
                                    conflict.getCourse().getSubject()
                            ),
                            List.of(detail)
                    );
                }
            }
        }

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

    private String getDayOfWeekName(int dayOfWeek) {
        return switch (dayOfWeek) {
            case 1 -> "Thứ Hai";
            case 2 -> "Thứ Ba";
            case 3 -> "Thứ Tư";
            case 4 -> "Thứ Năm";
            case 5 -> "Thứ Sáu";
            case 6 -> "Thứ Bảy";
            case 7 -> "Chủ Nhật";
            default -> "Thứ " + dayOfWeek;
        };
    }

    private String formatSchedule(String dayName, LocalTime startTime, LocalTime endTime) {
        return String.format("%s, %s - %s", dayName, startTime, endTime);
    }

    @Override
    public List<CourseSchedule> getCourseSchedules(Long courseId) {
        return courseScheduleRepository.findByCourseId(courseId);
    }
}
