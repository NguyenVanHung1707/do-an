package com.example.backend.repository;

import com.example.backend.entity.SemesterWeek;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SemesterWeekRepository extends JpaRepository<SemesterWeek, Long> {
    List<SemesterWeek> findBySemesterIdOrderByWeekNumberAsc(Long semesterId);
    void deleteBySemesterId(Long semesterId);
}
