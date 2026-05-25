package com.example.backend.repository;

import com.example.backend.entity.CourseSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.List;

@Repository
public interface CourseScheduleRepository extends JpaRepository<CourseSchedule, Long> {
    List<CourseSchedule> findByCourseId(Long courseId);
    void deleteByCourseId(Long courseId);

    @Query("SELECT cs FROM CourseSchedule cs " +
           "WHERE cs.course.semester.id = :semesterId " +
           "  AND cs.course.teacher.id = :teacherId " +
           "  AND cs.dayOfWeek = :dayOfWeek " +
           "  AND cs.startTime < :endTime " +
           "  AND cs.endTime > :startTime " +
           "  AND (:excludeCourseId IS NULL OR cs.course.id != :excludeCourseId)")
    List<CourseSchedule> findOverlappingTeacherSchedules(
        @Param("semesterId") Long semesterId,
        @Param("teacherId") Long teacherId,
        @Param("dayOfWeek") Integer dayOfWeek,
        @Param("startTime") LocalTime startTime,
        @Param("endTime") LocalTime endTime,
        @Param("excludeCourseId") Long excludeCourseId
    );

    @Query("SELECT r.id.student.id, cs FROM CourseSchedule cs " +
           "JOIN Register r ON cs.course.id = r.id.course.id " +
           "WHERE r.id.student.id IN (:studentIds) " +
           "  AND cs.course.semester.id = :semesterId")
    List<Object[]> findStudentsSchedulesWithStudentId(
        @Param("studentIds") List<Long> studentIds,
        @Param("semesterId") Long semesterId
    );
}
