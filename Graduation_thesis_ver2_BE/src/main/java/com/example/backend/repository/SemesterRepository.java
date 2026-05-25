package com.example.backend.repository;

import com.example.backend.entity.Semester;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SemesterRepository extends JpaRepository<Semester, Long> {
    Optional<Semester> findByIsActiveTrue();
    List<Semester> findByOrderByCodeDesc();
    Optional<Semester> findByCode(String code);
}
