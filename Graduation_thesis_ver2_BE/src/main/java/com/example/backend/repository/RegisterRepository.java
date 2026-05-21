package com.example.backend.repository;

import com.example.backend.entity.Course;
import com.example.backend.entity.Register;
import com.example.backend.entity.RegisterId;
import com.example.backend.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RegisterRepository extends JpaRepository<Register, RegisterId> {
    Optional<Register> findById(RegisterId registerId);

    List<Register> findByIdCourse(Course course);

    @Query("select count(r) from Register r where r.id.course = ?1")
    Double countAllByIdCourse(Course course);

    Optional<Course> findCourseById(RegisterId registerId);

    @Query("select r from Register r where r.id.student = ?1")
    List<Register> findByIdStudent(Student student);
}