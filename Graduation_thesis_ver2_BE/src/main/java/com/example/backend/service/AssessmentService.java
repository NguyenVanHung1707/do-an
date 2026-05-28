package com.example.backend.service;

import com.example.backend.dto.*;
import java.util.List;

public interface AssessmentService {
    
    // Teacher Methods
    AssessmentDto createAssessment(AssessmentDto assessmentDto, String teacherKeycloakId);
    List<StudentSubmissionDto> getSubmissions(Long assessmentId, String teacherKeycloakId);
    StudentSubmissionDto gradeSubmission(Long submissionId, TeacherGradingDto gradingDto, String teacherKeycloakId);
    void releaseScores(Long assessmentId, String teacherKeycloakId);
    byte[] getQuestionsImportTemplate() throws Exception;
    List<java.util.Map<String, Object>> importQuestionsFromExcel(org.springframework.web.multipart.MultipartFile file) throws Exception;
    
    // Student Methods
    List<AssessmentDto> getAssessmentsForCourse(Long courseId, String studentKeycloakId);
    StudentSubmissionDto startAssessment(Long assessmentId, String studentKeycloakId, LocationCheckRequest location);
    void saveDraft(Long submissionId, SubmissionAnswerDto draftDto, String studentKeycloakId);
    StudentSubmissionDto submitAssessment(Long submissionId, String studentKeycloakId, LocationCheckRequest location);
    StudentSubmissionDto getSubmissionGrades(Long submissionId, String studentKeycloakId);
}
