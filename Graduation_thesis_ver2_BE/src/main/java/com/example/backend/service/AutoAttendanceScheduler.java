package com.example.backend.service;

import com.example.backend.entity.AttendanceLog;
import com.example.backend.entity.Course;
import com.example.backend.entity.CourseSchedule;
import com.example.backend.entity.Register;
import com.example.backend.entity.SemesterWeek;
import com.example.backend.entity.Student;
import com.example.backend.repository.AttendanceLogRepository;
import com.example.backend.repository.CourseScheduleRepository;
import com.example.backend.repository.RegisterRepository;
import com.example.backend.repository.SemesterWeekRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AutoAttendanceScheduler {

    private final CourseScheduleRepository courseScheduleRepository;
    private final RegisterRepository registerRepository;
    private final SemesterWeekRepository semesterWeekRepository;
    private final AttendanceLogRepository attendanceLogRepository;

    @Value("${app.timezone:Asia/Ho_Chi_Minh}")
    private String appTimezone;

    /**
     * Runs daily at midnight (00:00 AM) Hanoi time.
     * Scans for classes scheduled on the previous day.
     * If no attendance records exist for a scheduled class session,
     * marks all registered students as present (isAttendance = true)
     * and updates their attendance statistics in the register table.
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "${app.timezone:Asia/Ho_Chi_Minh}")
    @Transactional
    public void processAutoAttendanceForYesterday() {
        ZoneId zoneId = ZoneId.of(appTimezone);
        LocalDate today = LocalDate.now(zoneId);
        LocalDate yesterday = today.minusDays(1);
        int dayOfWeek = yesterday.getDayOfWeek().getValue(); // 1: Monday, ..., 7: Sunday

        log.info("Starting automatic attendance scheduler for yesterday: {}, day of week: {}", yesterday, dayOfWeek);

        List<CourseSchedule> yesterdaySchedules = courseScheduleRepository.findSchedulesForDate(yesterday, dayOfWeek);
        log.info("Found {} schedules for yesterday: {}", yesterdaySchedules.size(), yesterday);

        for (CourseSchedule schedule : yesterdaySchedules) {
            Course course = schedule.getCourse();
            if (course == null) {
                continue;
            }

            // 1. Check if yesterday was a holiday week for this course/semester
            if (isHolidayWeek(schedule, yesterday)) {
                log.info("Skipping schedule id {} of course '{}' because yesterday was holiday", schedule.getId(), course.getSubject());
                continue;
            }

            // 2. Find SemesterWeek to retrieve current week/lecture number
            if (course.getSemester() == null) {
                log.warn("Course schedule id {} does not have a semester assigned. Skipping.", schedule.getId());
                continue;
            }

            Optional<SemesterWeek> weekOpt = semesterWeekRepository
                    .findFirstBySemesterIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                            course.getSemester().getId(),
                            yesterday,
                            yesterday
                    );

            if (weekOpt.isEmpty()) {
                log.warn("No SemesterWeek found for course '{}' and date '{}'. Skipping.", course.getSubject(), yesterday);
                continue;
            }

            SemesterWeek week = weekOpt.get();
            Integer lectureNumber = week.getWeekNumber();

            // 3. Check if teacher taken attendance in any form (any logs exist for course_id and lectureNumber)
            boolean attendanceTaken = attendanceLogRepository.existsByCourseIdAndLectureNumber(course.getId(), lectureNumber);
            if (attendanceTaken) {
                log.info("Attendance already taken for course '{}' (id: {}) in lecture/week {}. Skipping.", 
                        course.getSubject(), course.getId(), lectureNumber);
                continue;
            }

            log.info("No attendance recorded for course '{}' (id: {}) in lecture/week {}. Auto-populating present logs for all students...", 
                    course.getSubject(), course.getId(), lectureNumber);

            // 4. Retrieve registered students
            List<Register> registrations = registerRepository.findByIdCourse(course);
            if (registrations.isEmpty()) {
                log.info("No registered students found for course '{}'. Skipping.", course.getSubject());
                continue;
            }

            // Set attendance time as yesterday's date at class start time
            OffsetDateTime attendanceTime = yesterday.atTime(schedule.getStartTime()).atZone(zoneId).toOffsetDateTime();

            // 5. Populate present logs and update aggregate stats
            int count = 0;
            for (Register register : registrations) {
                Student student = register.getId().getStudent();
                if (student == null) {
                    continue;
                }

                AttendanceLog logEntry = new AttendanceLog();
                logEntry.setStudent(student);
                logEntry.setCourse(course);
                logEntry.setLectureNumber(lectureNumber);
                logEntry.setIsAttendance(true); // Automatically mark as present
                logEntry.setAttendanceTime(attendanceTime);
                attendanceLogRepository.save(logEntry);

                // Call procedure to recalculate stats inside register table
                registerRepository.updateAttendanceCount(course.getId(), student.getId());
                count++;
            }

            log.info("Successfully automatically marked {} students present for course '{}' (lecture/week {})", 
                    count, course.getSubject(), lectureNumber);
        }

        log.info("Finished automatic attendance scheduler execution for date: {}", yesterday);
    }

    private boolean isHolidayWeek(CourseSchedule schedule, LocalDate scheduleDate) {
        Course course = schedule.getCourse();
        if (course.getSemester() == null) {
            return false;
        }

        return semesterWeekRepository
                .findFirstBySemesterIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                        course.getSemester().getId(),
                        scheduleDate,
                        scheduleDate
                )
                .map(SemesterWeek::getWeekType)
                .map(type -> "HOLIDAY".equalsIgnoreCase(type))
                .orElse(false);
    }
}
