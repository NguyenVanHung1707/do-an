package com.example.backend.service;

import com.example.backend.entity.ClassReminderNotificationLog;
import com.example.backend.entity.Course;
import com.example.backend.entity.CourseSchedule;
import com.example.backend.entity.Register;
import com.example.backend.entity.SemesterWeek;
import com.example.backend.entity.Student;
import com.example.backend.entity.Teacher;
import com.example.backend.repository.ClassReminderNotificationLogRepository;
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
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClassReminderScheduler {

    private static final String TEACHER = "TEACHER";
    private static final String STUDENT = "STUDENT";

    private final CourseScheduleRepository courseScheduleRepository;
    private final RegisterRepository registerRepository;
    private final SemesterWeekRepository semesterWeekRepository;
    private final ClassReminderNotificationLogRepository reminderLogRepository;
    private final NotificationService notificationService;

    @Value("${app.timezone:Asia/Ho_Chi_Minh}")
    private String appTimezone;

    @Scheduled(cron = "0 * * * * *", zone = "${app.timezone:Asia/Ho_Chi_Minh}")
    @Transactional
    public void sendClassStartReminders() {
        ZoneId zoneId = ZoneId.of(appTimezone);
        ZonedDateTime targetDateTime = ZonedDateTime.now(zoneId)
                .plusMinutes(15)
                .truncatedTo(ChronoUnit.MINUTES);
        LocalDate scheduleDate = targetDateTime.toLocalDate();
        LocalTime windowStart = targetDateTime.toLocalTime();
        LocalTime windowEnd = windowStart.plusMinutes(1);
        int dayOfWeek = targetDateTime.getDayOfWeek().getValue();

        List<CourseSchedule> upcomingSchedules = courseScheduleRepository.findSchedulesStartingInWindow(
                scheduleDate,
                dayOfWeek,
                windowStart,
                windowEnd
        );

        for (CourseSchedule schedule : upcomingSchedules) {
            if (isHolidayWeek(schedule, scheduleDate)) {
                continue;
            }
            sendReminderForSchedule(schedule, scheduleDate);
        }
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

    private void sendReminderForSchedule(CourseSchedule schedule, LocalDate scheduleDate) {
        Course course = schedule.getCourse();
        String title = "Sắp đến giờ học!";
        String body = String.format(
                "Môn %s sẽ bắt đầu vào lúc %s tại phòng %s. Vui lòng chuẩn bị!",
                course.getSubject(),
                formatTime(schedule.getStartTime()),
                schedule.getRoomName() == null || schedule.getRoomName().isBlank() ? "chưa xếp phòng" : schedule.getRoomName()
        );
        Map<String, String> data = Map.of(
                "type", "CLASS_REMINDER",
                "targetScreen", "ClassDetail",
                "courseId", String.valueOf(course.getId()),
                "scheduleDate", scheduleDate.toString()
        );

        Teacher teacher = course.getTeacher();
        if (teacher != null && teacher.getKeycloakId() != null) {
            sendToUserIfNeeded(course.getId(), teacher.getId(), TEACHER, teacher.getKeycloakId(), scheduleDate, schedule.getStartTime(), title, body, data);
        }

        List<Register> registers = registerRepository.findByIdCourse(course);
        for (Register register : registers) {
            Student student = register.getId().getStudent();
            if (student != null && student.getKeycloakId() != null) {
                sendToUserIfNeeded(course.getId(), student.getId(), STUDENT, student.getKeycloakId(), scheduleDate, schedule.getStartTime(), title, body, data);
            }
        }
    }

    private void sendToUserIfNeeded(
            Long courseId,
            Long userId,
            String userType,
            String keycloakId,
            LocalDate scheduleDate,
            LocalTime scheduleStartTime,
            String title,
            String body,
            Map<String, String> data) {
        boolean alreadySent = reminderLogRepository.existsByCourseIdAndUserIdAndUserTypeAndScheduleDateAndScheduleStartTime(
                courseId,
                userId,
                userType,
                scheduleDate,
                scheduleStartTime
        );
        if (alreadySent) {
            return;
        }

        notificationService.sendPushNotification(keycloakId, title, body, data);

        ClassReminderNotificationLog logEntry = new ClassReminderNotificationLog();
        logEntry.setCourseId(courseId);
        logEntry.setUserId(userId);
        logEntry.setUserType(userType);
        logEntry.setScheduleDate(scheduleDate);
        logEntry.setScheduleStartTime(scheduleStartTime);
        reminderLogRepository.save(logEntry);
    }

    private String formatTime(LocalTime time) {
        return time.truncatedTo(ChronoUnit.MINUTES).toString();
    }
}
