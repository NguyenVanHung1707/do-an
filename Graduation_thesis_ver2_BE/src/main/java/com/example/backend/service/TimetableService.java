package com.example.backend.service;

import com.example.backend.dto.TimetableItemDto;
import com.example.backend.dto.TimetableResponseDto;
import com.example.backend.entity.Course;
import com.example.backend.entity.CourseSchedule;
import com.example.backend.entity.Semester;
import com.example.backend.entity.SemesterWeek;
import com.example.backend.entity.Student;
import com.example.backend.entity.Teacher;
import com.example.backend.exception.CustomException;
import com.example.backend.repository.CourseScheduleRepository;
import com.example.backend.repository.SemesterRepository;
import com.example.backend.repository.SemesterWeekRepository;
import com.example.backend.repository.StudentRepository;
import com.example.backend.repository.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TimetableService {

    private final SemesterRepository semesterRepository;
    private final SemesterWeekRepository semesterWeekRepository;
    private final CourseScheduleRepository courseScheduleRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;

    @Value("${app.timezone:Asia/Ho_Chi_Minh}")
    private String appTimezone;

    public TimetableResponseDto getTimetable(Long semesterId, Integer weekNumber, Jwt jwt) {
        if (jwt == null) {
            throw new CustomException("Unauthorized", HttpStatus.UNAUTHORIZED);
        }

        Semester semester = resolveSemester(semesterId);
        WeekWindow week = resolveWeek(semester, weekNumber);
        String role = resolveRole(jwt);
        String keycloakId = jwt.getClaimAsString("sub");

        List<CourseSchedule> schedules = switch (role) {
            case "teacher" -> {
                Teacher teacher = teacherRepository.findByKeycloakId(keycloakId)
                        .orElseThrow(() -> new CustomException("Không tìm thấy giảng viên", HttpStatus.NOT_FOUND));
                yield courseScheduleRepository.findTeacherTimetableSchedules(teacher.getId(), semester.getId());
            }
            case "student" -> {
                Student student = studentRepository.findByKeycloakId(keycloakId)
                        .orElseThrow(() -> new CustomException("Không tìm thấy sinh viên", HttpStatus.NOT_FOUND));
                yield courseScheduleRepository.findStudentTimetableSchedules(student.getId(), semester.getId());
            }
            default -> throw new CustomException("Chỉ sinh viên hoặc giảng viên được xem thời khóa biểu", HttpStatus.FORBIDDEN);
        };

        List<TimetableItemDto> items = "HOLIDAY".equalsIgnoreCase(week.weekType())
                ? List.of()
                : schedules.stream()
                        .map(schedule -> toItem(schedule, week, semester))
                        .filter(item -> !item.getDate().isBefore(week.startDate()) && !item.getDate().isAfter(week.endDate()))
                        .filter(item -> !item.getDate().isBefore(semester.getStartDate()) && !item.getDate().isAfter(semester.getEndDate()))
                        .sorted(Comparator
                                .comparing(TimetableItemDto::getDayOfWeek)
                                .thenComparing(TimetableItemDto::getStartTime)
                                .thenComparing(TimetableItemDto::getSubject, Comparator.nullsLast(String::compareToIgnoreCase)))
                        .toList();

        return new TimetableResponseDto(
                semester.getId(),
                semester.getCode(),
                week.weekNumber(),
                week.weekType(),
                week.startDate(),
                week.endDate(),
                ZoneId.of(appTimezone).getId(),
                role,
                items
        );
    }

    private Semester resolveSemester(Long semesterId) {
        if (semesterId != null) {
            return semesterRepository.findById(semesterId)
                    .orElseThrow(() -> new CustomException("Không tìm thấy học kỳ", HttpStatus.NOT_FOUND));
        }

        return semesterRepository.findByIsActiveTrue()
                .orElseThrow(() -> new CustomException("Chưa có học kỳ hiện tại", HttpStatus.NOT_FOUND));
    }

    private WeekWindow resolveWeek(Semester semester, Integer requestedWeekNumber) {
        Integer weekNumber = requestedWeekNumber != null ? requestedWeekNumber : resolveCurrentWeekNumber(semester);

        return semesterWeekRepository.findBySemesterIdAndWeekNumber(semester.getId(), weekNumber)
                .map(week -> new WeekWindow(
                        week.getWeekNumber(),
                        week.getStartDate(),
                        week.getEndDate(),
                        week.getWeekType()
                ))
                .orElseGet(() -> fallbackWeekWindow(semester, weekNumber));
    }

    private Integer resolveCurrentWeekNumber(Semester semester) {
        LocalDate today = LocalDate.now(ZoneId.of(appTimezone));
        return semesterWeekRepository
                .findFirstBySemesterIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                        semester.getId(),
                        today,
                        today
                )
                .map(SemesterWeek::getWeekNumber)
                .orElseGet(() -> {
                    if (today.isBefore(semester.getStartDate())) {
                        return 1;
                    }
                    if (today.isAfter(semester.getEndDate())) {
                        return (int) (ChronoUnit.DAYS.between(semester.getStartDate(), semester.getEndDate()) / 7) + 1;
                    }
                    return (int) (ChronoUnit.DAYS.between(semester.getStartDate(), today) / 7) + 1;
                });
    }

    private WeekWindow fallbackWeekWindow(Semester semester, Integer weekNumber) {
        int normalizedWeek = Math.max(1, weekNumber);
        LocalDate startDate = semester.getStartDate().plusWeeks(normalizedWeek - 1L);
        LocalDate endDate = startDate.plusDays(6);
        if (endDate.isAfter(semester.getEndDate())) {
            endDate = semester.getEndDate();
        }
        return new WeekWindow(normalizedWeek, startDate, endDate, "STUDY");
    }

    private TimetableItemDto toItem(CourseSchedule schedule, WeekWindow week, Semester semester) {
        Course course = schedule.getCourse();
        LocalDate scheduleDate = week.startDate().plusDays(schedule.getDayOfWeek() - 1L);
        String teacherName = course.getTeacher() != null ? course.getTeacher().getName() : null;

        return new TimetableItemDto(
                schedule.getId(),
                course.getId(),
                course.getCourseCode(),
                course.getSubject(),
                schedule.getRoomName(),
                schedule.getDayOfWeek(),
                scheduleDate,
                schedule.getStartTime(),
                schedule.getEndTime(),
                teacherName,
                scheduleDate.isBefore(semester.getStartDate()) || scheduleDate.isAfter(semester.getEndDate())
                        ? "OUT_OF_SEMESTER"
                        : "ACTIVE"
        );
    }

    private String resolveRole(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess != null && realmAccess.get("roles") instanceof List<?> roles) {
            if (roles.contains("teacher")) {
                return "teacher";
            }
            if (roles.contains("student")) {
                return "student";
            }
        }
        return "unknown";
    }

    private record WeekWindow(Integer weekNumber, LocalDate startDate, LocalDate endDate, String weekType) {
    }
}
