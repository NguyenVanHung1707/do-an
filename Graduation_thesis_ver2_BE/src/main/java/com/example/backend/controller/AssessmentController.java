package com.example.backend.controller;

import com.example.backend.dto.*;
import com.example.backend.service.AssessmentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class AssessmentController {

    private final AssessmentService assessmentService;

    public AssessmentController(AssessmentService assessmentService) {
        this.assessmentService = assessmentService;
    }

    // ==========================================
    // TEACHER ENDPOINTS
    // ==========================================

    @PostMapping("/teacher/assessments")
    public ResponseEntity<AssessmentDto> createAssessment(
            @RequestBody AssessmentDto assessmentDto,
            @AuthenticationPrincipal Jwt jwt) {
        String teacherId = jwt.getClaimAsString("sub");
        return ResponseEntity.ok(assessmentService.createAssessment(assessmentDto, teacherId));
    }

    @GetMapping("/teacher/assessments/{id}/submissions")
    public ResponseEntity<List<StudentSubmissionDto>> getSubmissions(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        String teacherId = jwt.getClaimAsString("sub");
        return ResponseEntity.ok(assessmentService.getSubmissions(id, teacherId));
    }

    @PutMapping("/teacher/submissions/{subId}/grade")
    public ResponseEntity<StudentSubmissionDto> gradeSubmission(
            @PathVariable Long subId,
            @RequestBody TeacherGradingDto gradingDto,
            @AuthenticationPrincipal Jwt jwt) {
        String teacherId = jwt.getClaimAsString("sub");
        return ResponseEntity.ok(assessmentService.gradeSubmission(subId, gradingDto, teacherId));
    }

    @PutMapping("/teacher/assessments/{id}/release-scores")
    public ResponseEntity<Void> releaseScores(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        String teacherId = jwt.getClaimAsString("sub");
        assessmentService.releaseScores(id, teacherId);
        return ResponseEntity.ok().build();
    }

    // ==========================================
    // STUDENT ENDPOINTS
    // ==========================================

    @GetMapping("/courses/{courseId}/assessments")
    public ResponseEntity<List<AssessmentDto>> getAssessmentsForCourse(
            @PathVariable Long courseId,
            @AuthenticationPrincipal Jwt jwt) {
        String studentId = jwt.getClaimAsString("sub");
        return ResponseEntity.ok(assessmentService.getAssessmentsForCourse(courseId, studentId));
    }

    @PostMapping("/assessments/{id}/start")
    public ResponseEntity<StudentSubmissionDto> startAssessment(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        String studentId = jwt.getClaimAsString("sub");
        return ResponseEntity.ok(assessmentService.startAssessment(id, studentId));
    }

    @PostMapping("/submissions/{subId}/save-draft")
    public ResponseEntity<Void> saveDraft(
            @PathVariable Long subId,
            @RequestBody SubmissionAnswerDto draftDto,
            @AuthenticationPrincipal Jwt jwt) {
        String studentId = jwt.getClaimAsString("sub");
        assessmentService.saveDraft(subId, draftDto, studentId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/submissions/{subId}/submit")
    public ResponseEntity<StudentSubmissionDto> submitAssessment(
            @PathVariable Long subId,
            @AuthenticationPrincipal Jwt jwt) {
        String studentId = jwt.getClaimAsString("sub");
        return ResponseEntity.ok(assessmentService.submitAssessment(subId, studentId));
    }

    @GetMapping("/submissions/{subId}/grades")
    public ResponseEntity<StudentSubmissionDto> getSubmissionGrades(
            @PathVariable Long subId,
            @AuthenticationPrincipal Jwt jwt) {
        String studentId = jwt.getClaimAsString("sub");
        return ResponseEntity.ok(assessmentService.getSubmissionGrades(subId, studentId));
    }
}
