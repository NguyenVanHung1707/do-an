package com.example.backend.repository;

import com.example.backend.entity.Course;
import com.example.backend.entity.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    @Query("select c from Course c where c.teacher.keycloakId = ?1")
    List<Course> findByTeacherKeycloakId(String teacherKeycloakId);
    @Query("select c from Course c where c.teacher = ?1")
    List<Course> findByTeacher(Teacher teacher);

}