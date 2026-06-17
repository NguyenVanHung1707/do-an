package com.example.backend.repository;

import com.example.backend.entity.SemesterWeek;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface SemesterWeekRepository extends JpaRepository<SemesterWeek, Long> {
    List<SemesterWeek> findBySemesterIdOrderByWeekNumberAsc(Long semesterId);
    Optional<SemesterWeek> findBySemesterIdAndWeekNumber(Long semesterId, Integer weekNumber);
    Optional<SemesterWeek> findFirstBySemesterIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Long semesterId,
            LocalDate startDate,
            LocalDate endDate
    );
    void deleteBySemesterId(Long semesterId);
}
