package com.example.backend.repository;

import com.example.backend.entity.ClassReminderNotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;

@Repository
public interface ClassReminderNotificationLogRepository extends JpaRepository<ClassReminderNotificationLog, Long> {
    boolean existsByCourseIdAndUserIdAndUserTypeAndScheduleDateAndScheduleStartTime(
            Long courseId,
            Long userId,
            String userType,
            LocalDate scheduleDate,
            LocalTime scheduleStartTime
    );
}
