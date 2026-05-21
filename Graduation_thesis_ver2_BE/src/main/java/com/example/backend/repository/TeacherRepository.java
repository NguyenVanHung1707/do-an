package com.example.backend.repository;

import com.example.backend.entity.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface TeacherRepository extends JpaRepository<Teacher, Long> {
    Optional<Teacher> findByKeycloakId(String teacherKeycloakId);

    @Transactional
    @Modifying
    @Query(value = "CALL update_attendance_count(:courseId, :studentId)", nativeQuery = true)
    void updateAttendanceCount(@Param("courseId") Long courseId, @Param("studentId") Long studentId);
}