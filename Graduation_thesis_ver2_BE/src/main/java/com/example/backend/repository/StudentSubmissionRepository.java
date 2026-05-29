package com.example.backend.repository;

import com.example.backend.entity.StudentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentSubmissionRepository extends JpaRepository<StudentSubmission, Long> {
    List<StudentSubmission> findByAssessmentId(Long assessmentId);
    Optional<StudentSubmission> findFirstByAssessmentIdAndStudentIdOrderByStartedAtDesc(Long assessmentId, String studentId);
}
