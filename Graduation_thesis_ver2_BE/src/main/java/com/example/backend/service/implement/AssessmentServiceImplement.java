package com.example.backend.service.implement;

import com.example.backend.dto.*;
import com.example.backend.entity.*;
import com.example.backend.repository.*;
import com.example.backend.service.AssessmentService;
import com.example.backend.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class AssessmentServiceImplement implements AssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final AssessmentQuestionRepository questionRepository;
    private final StudentSubmissionRepository submissionRepository;
    private final StudentAnswerRepository studentAnswerRepository;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;

    public AssessmentServiceImplement(
            AssessmentRepository assessmentRepository,
            AssessmentQuestionRepository questionRepository,
            StudentSubmissionRepository submissionRepository,
            StudentAnswerRepository studentAnswerRepository,
            CourseRepository courseRepository,
            StudentRepository studentRepository,
            ObjectMapper objectMapper,
            NotificationService notificationService) {
        this.assessmentRepository = assessmentRepository;
        this.questionRepository = questionRepository;
        this.submissionRepository = submissionRepository;
        this.studentAnswerRepository = studentAnswerRepository;
        this.courseRepository = courseRepository;
        this.studentRepository = studentRepository;
        this.objectMapper = objectMapper;
        this.notificationService = notificationService;
    }

    @Override
    public AssessmentDto createAssessment(AssessmentDto dto, String teacherId) {
        Course course = courseRepository.findById(dto.getCourseId())
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));

        Assessment assessment = new Assessment();
        assessment.setCourse(course);
        assessment.setTitle(dto.getTitle());
        assessment.setDescription(dto.getDescription());
        assessment.setType(dto.getType());
        assessment.setMaxScore(dto.getMaxScore());
        assessment.setDurationMinutes(dto.getDurationMinutes());
        assessment.setDeadline(dto.getDeadline());
        assessment.setScoreReleaseMode(dto.getScoreReleaseMode() != null ? dto.getScoreReleaseMode() : "AUTOMATIC");
        assessment.setIsPublished(dto.getIsPublished() != null ? dto.getIsPublished() : false);

        Assessment saved = assessmentRepository.save(assessment);

        if (dto.getQuestions() != null) {
            for (int i = 0; i < dto.getQuestions().size(); i++) {
                AssessmentQuestionDto qDto = dto.getQuestions().get(i);
                AssessmentQuestion q = new AssessmentQuestion();
                q.setAssessment(saved);
                q.setType(qDto.getType());
                q.setContent(qDto.getContent());
                q.setScore(qDto.getScore() != null ? qDto.getScore() : 1.0);
                q.setOrderIndex(qDto.getOrderIndex() != null ? qDto.getOrderIndex() : i + 1);
                q.setMetadata(qDto.getMetadata());
                questionRepository.save(q);
            }
        }

        return getAssessmentDto(saved);
    }

    @Override
    public List<StudentSubmissionDto> getSubmissions(Long assessmentId, String teacherId) {
        List<StudentSubmission> subs = submissionRepository.findByAssessmentId(assessmentId);
        return subs.stream().map(this::getSubmissionDto).collect(Collectors.toList());
    }

    @Override
    public StudentSubmissionDto gradeSubmission(Long submissionId, TeacherGradingDto gradingDto, String teacherId) {
        StudentSubmission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Submission not found"));

        sub.setTeacherFeedback(gradingDto.getFeedback());
        sub.setGradedAt(OffsetDateTime.now());
        sub.setStatus("GRADED");

        List<StudentAnswer> answers = studentAnswerRepository.findBySubmissionId(submissionId);
        double finalScore = 0.0;

        for (StudentAnswer ans : answers) {
            Optional<TeacherGradingDto.QuestionGradeDto> gradeOpt = gradingDto.getAnswers().stream()
                    .filter(g -> g.getQuestionId().equals(ans.getQuestion().getId()))
                    .findFirst();

            if (gradeOpt.isPresent()) {
                TeacherGradingDto.QuestionGradeDto grade = gradeOpt.get();
                ans.setScore(grade.getScore());
                ans.setTeacherComment(grade.getComment());
                if (ans.getQuestion().getType().equals("ESSAY")) {
                    ans.setIsCorrect(grade.getScore() >= (ans.getQuestion().getScore() / 2.0));
                }
                studentAnswerRepository.save(ans);
            }

            if (ans.getScore() != null) {
                finalScore += ans.getScore();
            }
        }

        sub.setFinalScore(finalScore);
        StudentSubmission saved = submissionRepository.save(sub);
        
        try {
            notificationService.sendPushNotification(
                sub.getStudentId(), 
                "Kết quả học tập mới", 
                "Bài thi/Bài tập '" + sub.getAssessment().getTitle() + "' đã được chấm điểm. Điểm số: " + finalScore + "/" + sub.getAssessment().getMaxScore()
            );
        } catch (Exception e) {
            // Ignore notification errors
        }

        return getSubmissionDto(saved);
    }

    @Override
    public void releaseScores(Long assessmentId, String teacherId) {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assessment not found"));
        assessment.setScoreReleaseMode("AUTOMATIC");
        assessmentRepository.save(assessment);
    }

    @Override
    public List<AssessmentDto> getAssessmentsForCourse(Long courseId, String studentId) {
        List<Assessment> assessments = assessmentRepository.findByCourseId(courseId);
        List<AssessmentDto> dtos = new ArrayList<>();

        for (Assessment a : assessments) {
            AssessmentDto d = getAssessmentDto(a);
            
            Optional<StudentSubmission> subOpt = submissionRepository.findByAssessmentIdAndStudentId(a.getId(), studentId);
            if (subOpt.isPresent()) {
                StudentSubmission sub = subOpt.get();
                d.setSubmissionStatus(sub.getStatus());
                d.setSubmissionId(sub.getId());
                if ("AUTOMATIC".equals(a.getScoreReleaseMode()) || "GRADED".equals(sub.getStatus())) {
                    d.setStudentScore(sub.getFinalScore());
                }
            } else {
                d.setSubmissionStatus("NOT_STARTED");
            }
            
            dtos.add(d);
        }
        return dtos;
    }

    @Override
    public StudentSubmissionDto startAssessment(Long assessmentId, String studentId) {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assessment not found"));

        if (assessment.getDeadline() != null && assessment.getDeadline().isBefore(OffsetDateTime.now())) {
            throw new IllegalStateException("Deadline has already passed");
        }

        Optional<StudentSubmission> existingOpt = submissionRepository.findByAssessmentIdAndStudentId(assessmentId, studentId);
        StudentSubmission sub;
        if (existingOpt.isPresent()) {
            sub = existingOpt.get();
        } else {
            sub = new StudentSubmission();
            sub.setAssessment(assessment);
            sub.setStudentId(studentId);
            sub.setStartedAt(OffsetDateTime.now());
            sub.setStatus("IN_PROGRESS");
            sub = submissionRepository.save(sub);
        }

        return getSubmissionDto(sub);
    }

    @Override
    public void saveDraft(Long submissionId, SubmissionAnswerDto draftDto, String studentId) {
        StudentSubmission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Submission not found"));

        if (!sub.getStudentId().equals(studentId)) {
            throw new SecurityException("Unauthorized access");
        }

        if (!"IN_PROGRESS".equals(sub.getStatus())) {
            throw new IllegalStateException("Cannot edit submission that is not in progress");
        }

        AssessmentQuestion question = questionRepository.findById(draftDto.getQuestionId())
                .orElseThrow(() -> new IllegalArgumentException("Question not found"));

        List<StudentAnswer> existingAnswers = studentAnswerRepository.findBySubmissionId(submissionId);
        StudentAnswer answer = existingAnswers.stream()
                .filter(a -> a.getQuestion().getId().equals(draftDto.getQuestionId()))
                .findFirst()
                .orElseGet(() -> {
                    StudentAnswer a = new StudentAnswer();
                    a.setSubmission(sub);
                    a.setQuestion(question);
                    return a;
                });

        answer.setSelectedChoice(draftDto.getSelectedChoice());
        answer.setAnswerText(draftDto.getAnswerText());
        studentAnswerRepository.save(answer);
    }

    @Override
    public StudentSubmissionDto submitAssessment(Long submissionId, String studentId) {
        StudentSubmission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Submission not found"));

        if (!sub.getStudentId().equals(studentId)) {
            throw new SecurityException("Unauthorized access");
        }

        if (!"IN_PROGRESS".equals(sub.getStatus())) {
            return getSubmissionDto(sub);
        }

        sub.setSubmittedAt(OffsetDateTime.now());
        sub.setStatus("SUBMITTED");

        List<StudentAnswer> answers = studentAnswerRepository.findBySubmissionId(submissionId);
        List<AssessmentQuestion> questions = questionRepository.findByAssessmentIdOrderByOrderIndexAsc(sub.getAssessment().getId());

        double calculatedScore = 0.0;
        boolean hasEssay = false;

        for (AssessmentQuestion q : questions) {
            StudentAnswer ans = answers.stream()
                    .filter(a -> a.getQuestion().getId().equals(q.getId()))
                    .findFirst()
                    .orElseGet(() -> {
                        StudentAnswer a = new StudentAnswer();
                        a.setSubmission(sub);
                        a.setQuestion(q);
                        return studentAnswerRepository.save(a);
                    });

            if ("MULTIPLE_CHOICE".equals(q.getType())) {
                autoGradeMultipleChoice(q, ans);
                calculatedScore += ans.getScore() != null ? ans.getScore() : 0.0;
            } else if ("SHORT_ANSWER".equals(q.getType())) {
                autoGradeShortAnswer(q, ans);
                calculatedScore += ans.getScore() != null ? ans.getScore() : 0.0;
            } else if ("ESSAY".equals(q.getType())) {
                hasEssay = true;
                ans.setIsCorrect(null);
                ans.setScore(null);
                studentAnswerRepository.save(ans);
            }
        }

        sub.setFinalScore(calculatedScore);
        if (!hasEssay) {
            sub.setStatus("GRADED");
            sub.setGradedAt(OffsetDateTime.now());
        }

        StudentSubmission saved = submissionRepository.save(sub);

        if ("GRADED".equals(saved.getStatus())) {
            try {
                notificationService.sendPushNotification(
                    sub.getStudentId(), 
                    "Kết quả học tập mới", 
                    "Bài thi/Bài tập '" + sub.getAssessment().getTitle() + "' đã tự động chấm xong. Điểm số: " + calculatedScore + "/" + sub.getAssessment().getMaxScore()
                );
            } catch (Exception e) {
                // Ignore notification errors
            }
        }

        return getSubmissionDto(saved);
    }

    @Override
    public StudentSubmissionDto getSubmissionGrades(Long submissionId, String studentId) {
        StudentSubmission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Submission not found"));

        if (!sub.getStudentId().equals(studentId)) {
            throw new SecurityException("Unauthorized access");
        }

        Assessment assessment = sub.getAssessment();
        if ("MANUAL".equals(assessment.getScoreReleaseMode()) && !"GRADED".equals(sub.getStatus())) {
            throw new SecurityException("Grades have not been released yet");
        }

        return getSubmissionDto(sub);
    }

    private void autoGradeMultipleChoice(AssessmentQuestion q, StudentAnswer ans) {
        try {
            Map<String, Object> meta = objectMapper.readValue(q.getMetadata(), Map.class);
            String correctChoice = (String) meta.get("correct_choice");
            if (correctChoice != null && correctChoice.equalsIgnoreCase(ans.getSelectedChoice())) {
                ans.setScore(q.getScore());
                ans.setIsCorrect(true);
            } else {
                ans.setScore(0.0);
                ans.setIsCorrect(false);
            }
        } catch (Exception e) {
            ans.setScore(0.0);
            ans.setIsCorrect(false);
        }
        studentAnswerRepository.save(ans);
    }

    private void autoGradeShortAnswer(AssessmentQuestion q, StudentAnswer ans) {
        try {
            Map<String, Object> meta = objectMapper.readValue(q.getMetadata(), Map.class);
            List<String> keywords = (List<String>) meta.get("keywords");
            Boolean caseSensitive = (Boolean) meta.get("case_sensitive");
            boolean isCaseSensitive = caseSensitive != null && caseSensitive;

            String studentText = ans.getAnswerText() != null ? ans.getAnswerText().trim() : "";
            boolean matched = false;

            if (keywords != null) {
                for (String kw : keywords) {
                    if (isCaseSensitive) {
                        if (studentText.equals(kw.trim())) {
                            matched = true;
                            break;
                        }
                    } else {
                        if (studentText.equalsIgnoreCase(kw.trim())) {
                            matched = true;
                            break;
                        }
                    }
                }
            }

            if (matched) {
                ans.setScore(q.getScore());
                ans.setIsCorrect(true);
            } else {
                ans.setScore(0.0);
                ans.setIsCorrect(false);
            }
        } catch (Exception e) {
            ans.setScore(0.0);
            ans.setIsCorrect(false);
        }
        studentAnswerRepository.save(ans);
    }

    private AssessmentDto getAssessmentDto(Assessment a) {
        AssessmentDto d = new AssessmentDto();
        d.setId(a.getId());
        d.setCourseId(a.getCourse().getId());
        d.setTitle(a.getTitle());
        d.setDescription(a.getDescription());
        d.setType(a.getType());
        d.setMaxScore(a.getMaxScore());
        d.setDurationMinutes(a.getDurationMinutes());
        d.setDeadline(a.getDeadline());
        d.setScoreReleaseMode(a.getScoreReleaseMode());
        d.setIsPublished(a.getIsPublished());
        d.setCreatedAt(a.getCreatedAt());
        d.setUpdatedAt(a.getUpdatedAt());

        List<AssessmentQuestion> qs = questionRepository.findByAssessmentIdOrderByOrderIndexAsc(a.getId());
        d.setQuestions(qs.stream().map(q -> {
            AssessmentQuestionDto qDto = new AssessmentQuestionDto();
            qDto.setId(q.getId());
            qDto.setAssessmentId(q.getAssessment().getId());
            qDto.setType(q.getType());
            qDto.setContent(q.getContent());
            qDto.setScore(q.getScore());
            qDto.setOrderIndex(q.getOrderIndex());
            qDto.setMetadata(filterMetadata(q.getType(), q.getMetadata()));
            return qDto;
        }).collect(Collectors.toList()));

        return d;
    }

    private String filterMetadata(String type, String fullMetadata) {
        if (fullMetadata == null) return null;
        try {
            Map<String, Object> meta = objectMapper.readValue(fullMetadata, Map.class);
            if ("MULTIPLE_CHOICE".equals(type)) {
                meta.remove("correct_choice");
            } else if ("SHORT_ANSWER".equals(type)) {
                meta.remove("keywords");
            }
            return objectMapper.writeValueAsString(meta);
        } catch (Exception e) {
            return null;
        }
    }

    private StudentSubmissionDto getSubmissionDto(StudentSubmission sub) {
        StudentSubmissionDto d = new StudentSubmissionDto();
        d.setId(sub.getId());
        d.setAssessmentId(sub.getAssessment().getId());
        d.setStudentId(sub.getStudentId());
        
        Optional<Student> studentOpt = studentRepository.findByKeycloakId(sub.getStudentId());
        studentOpt.ifPresent(student -> d.setStudentName(student.getName()));

        d.setStartedAt(sub.getStartedAt());
        d.setSubmittedAt(sub.getSubmittedAt());
        d.setFinalScore(sub.getFinalScore());
        d.setStatus(sub.getStatus());
        d.setTeacherFeedback(sub.getTeacherFeedback());
        d.setGradedAt(sub.getGradedAt());
        d.setCreatedAt(sub.getCreatedAt());

        List<StudentAnswer> answers = studentAnswerRepository.findBySubmissionId(sub.getId());
        d.setAnswers(answers.stream().map(a -> {
            SubmissionAnswerDto aDto = new SubmissionAnswerDto();
            aDto.setQuestionId(a.getQuestion().getId());
            aDto.setSelectedChoice(a.getSelectedChoice());
            aDto.setAnswerText(a.getAnswerText());
            aDto.setScore(a.getScore());
            aDto.setIsCorrect(a.getIsCorrect());
            aDto.setTeacherComment(a.getTeacherComment());
            return aDto;
        }).collect(Collectors.toList()));

        return d;
    }
}
