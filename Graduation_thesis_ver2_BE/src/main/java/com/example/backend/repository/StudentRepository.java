package com.example.backend.repository;

import com.example.backend.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    @Query("select s from Student s where s.name like concat('%', ?1, '%') or s.studentCode like concat('%', ?1, '%')")
    List<Student> findByNameContaining(String name);

    Optional<Student> findByKeycloakId(String keycloakId);

    Optional<Student> findByStudentCode(String studentCode);
}