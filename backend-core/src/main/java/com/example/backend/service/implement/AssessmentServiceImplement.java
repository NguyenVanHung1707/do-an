package com.example.backend.service.implement;

import com.example.backend.dto.*;
import com.example.backend.entity.*;
import com.example.backend.exception.CustomException;
import com.example.backend.repository.*;
import com.example.backend.service.AssessmentService;
import com.example.backend.service.NotificationService;
import com.example.backend.util.GeoDistanceUtils;
import com.example.backend.util.QuestionExcelParser;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.ByteArrayOutputStream;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
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

        Double calculatedMaxScore = 0.0;
        if (dto.getQuestions() != null && !dto.getQuestions().isEmpty()) {
            for (AssessmentQuestionDto qDto : dto.getQuestions()) {
                calculatedMaxScore += qDto.getScore() != null ? qDto.getScore() : 1.0;
            }
        } else {
            calculatedMaxScore = dto.getMaxScore() != null ? dto.getMaxScore() : 10.0;
        }
        assessment.setMaxScore(calculatedMaxScore);
        assessment.setDurationMinutes(dto.getDurationMinutes());
        assessment.setDeadline(dto.getDeadline());
        assessment.setScoreReleaseMode(dto.getScoreReleaseMode() != null ? dto.getScoreReleaseMode() : "AUTOMATIC");
        assessment.setIsPublished(dto.getIsPublished() != null ? dto.getIsPublished() : false);
        assessment.setIsCameraRequired(dto.getIsCameraRequired() != null ? dto.getIsCameraRequired() : false);
        assessment.setWeight(dto.getWeight() != null ? dto.getWeight() : 0.0);
        applyAssessmentGeofenceConfig(assessment, dto);

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
            
            Optional<StudentSubmission> subOpt = submissionRepository.findFirstByAssessmentIdAndStudentIdOrderByStartedAtDesc(a.getId(), studentId);
            if (subOpt.isPresent()) {
                StudentSubmission sub = subOpt.get();
                d.setSubmissionId(sub.getId());
                
                // If release mode is MANUAL, student's view of submission status must be kept as SUBMITTED (not GRADED)
                // and scores are hidden, until the teacher releases them (by turning release mode to AUTOMATIC).
                if ("MANUAL".equals(a.getScoreReleaseMode())) {
                    if ("GRADED".equals(sub.getStatus()) || "SUBMITTED".equals(sub.getStatus())) {
                        d.setSubmissionStatus("SUBMITTED");
                    } else {
                        d.setSubmissionStatus(sub.getStatus());
                    }
                    d.setStudentScore(null);
                } else {
                    d.setSubmissionStatus(sub.getStatus());
                    if ("AUTOMATIC".equals(a.getScoreReleaseMode()) || "GRADED".equals(sub.getStatus())) {
                        d.setStudentScore(sub.getFinalScore());
                    }
                }
            } else {
                d.setSubmissionStatus("NOT_STARTED");
            }
            
            dtos.add(d);
        }
        return dtos;
    }

    @Override
    public StudentSubmissionDto startAssessment(Long assessmentId, String studentId, LocationCheckRequest location) {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assessment not found"));

        if (assessment.getDeadline() != null && assessment.getDeadline().isBefore(OffsetDateTime.now())) {
            throw new IllegalStateException("Deadline has already passed");
        }

        Double distance = validateAssessmentLocation(assessment, location);

        Optional<StudentSubmission> existingOpt = submissionRepository.findFirstByAssessmentIdAndStudentIdOrderByStartedAtDesc(assessmentId, studentId);
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
        applyLocationEvidence(sub, location, distance, Boolean.TRUE.equals(assessment.getIsLocationRequired()) ? true : null);
        sub = submissionRepository.save(sub);

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
    public StudentSubmissionDto submitAssessment(Long submissionId, String studentId, LocationCheckRequest location) {
        StudentSubmission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Submission not found"));

        if (!sub.getStudentId().equals(studentId)) {
            throw new SecurityException("Unauthorized access");
        }

        if (!"IN_PROGRESS".equals(sub.getStatus())) {
            return getSubmissionDto(sub);
        }

        Double distance = validateAssessmentLocation(sub.getAssessment(), location);
        applyLocationEvidence(sub, location, distance, Boolean.TRUE.equals(sub.getAssessment().getIsLocationRequired()) ? true : null);

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

        // Allow access to the student themselves (if authorized)
        if (sub.getStudentId().equals(studentId)) {
            Assessment assessment = sub.getAssessment();
            // Deny access if the grades are not yet released, unless the submission is still in progress (taking/resuming exam)
            if ("MANUAL".equals(assessment.getScoreReleaseMode()) && 
                ("SUBMITTED".equals(sub.getStatus()) || "GRADED".equals(sub.getStatus()))) {
                throw new SecurityException("Grades have not been released yet");
            }
            return getSubmissionDto(sub);
        }

        // Allow access to the course teacher
        if (sub.getAssessment().getCourse().getTeacher() != null && 
            studentId.equals(sub.getAssessment().getCourse().getTeacher().getKeycloakId())) {
            return getSubmissionDto(sub);
        }

        throw new SecurityException("Unauthorized access");
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
        d.setIsLocationRequired(Boolean.TRUE.equals(a.getIsLocationRequired()));
        d.setIsCameraRequired(Boolean.TRUE.equals(a.getIsCameraRequired()));
        d.setAllowedRadiusMeters(a.getAllowedRadiusMeters());
        d.setTeacherLatitude(a.getTeacherLatitude());
        d.setTeacherLongitude(a.getTeacherLongitude());
        d.setWeight(a.getWeight());

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
        studentOpt.ifPresent(student -> {
            d.setStudentName(student.getName());
            d.setStudentCode(student.getStudentCode());
        });

        d.setStartedAt(sub.getStartedAt());
        d.setSubmittedAt(sub.getSubmittedAt());
        d.setFinalScore(sub.getFinalScore());
        d.setStatus(sub.getStatus());
        d.setTeacherFeedback(sub.getTeacherFeedback());
        d.setGradedAt(sub.getGradedAt());
        d.setCreatedAt(sub.getCreatedAt());
        d.setStudentLatitude(sub.getStudentLatitude());
        d.setStudentLongitude(sub.getStudentLongitude());
        d.setCalculatedDistance(sub.getCalculatedDistance());
        d.setIsValidLocation(sub.getIsValidLocation());
        d.setMockLocationDetected(sub.getMockLocationDetected());

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

    private void applyAssessmentGeofenceConfig(Assessment assessment, AssessmentDto dto) {
        boolean required = Boolean.TRUE.equals(dto.getIsLocationRequired());
        assessment.setIsLocationRequired(required);
        assessment.setAllowedRadiusMeters(required ? dto.getAllowedRadiusMeters() : null);
        assessment.setTeacherLatitude(required ? dto.getTeacherLatitude() : null);
        assessment.setTeacherLongitude(required ? dto.getTeacherLongitude() : null);

        if (!required) {
            return;
        }

        try {
            GeoDistanceUtils.validateAllowedRadius(dto.getAllowedRadiusMeters());
            GeoDistanceUtils.validateCoordinates(dto.getTeacherLatitude(), dto.getTeacherLongitude());
        } catch (IllegalArgumentException ex) {
            throw new CustomException("Cấu hình vị trí bài kiểm tra không hợp lệ", HttpStatus.BAD_REQUEST);
        }
    }

    private Double validateAssessmentLocation(Assessment assessment, LocationCheckRequest location) {
        boolean required = Boolean.TRUE.equals(assessment.getIsLocationRequired());
        if (location != null && Boolean.TRUE.equals(location.getMockLocationDetected())) {
            throw new CustomException(
                    "Thiết bị đang bật vị trí giả",
                    HttpStatus.FORBIDDEN,
                    Map.of("reason", "MOCK_LOCATION_DETECTED")
            );
        }
        if (location == null || location.getLatitude() == null || location.getLongitude() == null) {
            if (required) {
                throw new CustomException("Vui lòng cấp quyền vị trí để tiếp tục", HttpStatus.BAD_REQUEST);
            }
            return null;
        }

        try {
            GeoDistanceUtils.validateCoordinates(location.getLatitude(), location.getLongitude());
        } catch (IllegalArgumentException ex) {
            throw new CustomException("Tọa độ không hợp lệ", HttpStatus.BAD_REQUEST);
        }

        if (assessment.getTeacherLatitude() == null || assessment.getTeacherLongitude() == null) {
            if (required) {
                throw new CustomException("Cấu hình vị trí bài kiểm tra không hợp lệ", HttpStatus.BAD_REQUEST);
            }
            return null;
        }

        double distance = GeoDistanceUtils.distanceMeters(
                assessment.getTeacherLatitude(),
                assessment.getTeacherLongitude(),
                location.getLatitude(),
                location.getLongitude()
        );

        if (required && (assessment.getAllowedRadiusMeters() == null || distance > assessment.getAllowedRadiusMeters())) {
            throw new CustomException(
                    "Bạn không ở trong phạm vi lớp học",
                    HttpStatus.FORBIDDEN,
                    Map.of(
                            "reason", "OUT_OF_RANGE",
                            "allowedRadiusMeters", assessment.getAllowedRadiusMeters(),
                            "calculatedDistanceMeters", Math.round(distance),
                            "teacherLatitude", assessment.getTeacherLatitude(),
                            "teacherLongitude", assessment.getTeacherLongitude(),
                            "studentLatitude", location.getLatitude(),
                            "studentLongitude", location.getLongitude()
                    )
            );
        }

        return distance;
    }

    private void applyLocationEvidence(
            StudentSubmission submission,
            LocationCheckRequest location,
            Double distance,
            Boolean validLocation
    ) {
        if (location == null || location.getLatitude() == null || location.getLongitude() == null) {
            return;
        }
        submission.setStudentLatitude(location.getLatitude());
        submission.setStudentLongitude(location.getLongitude());
        submission.setCalculatedDistance(distance);
        submission.setMockLocationDetected(Boolean.TRUE.equals(location.getMockLocationDetected()));
        submission.setIsValidLocation(validLocation);
    }

    @Override
    public byte[] getQuestionsImportTemplate() throws Exception {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Mẫu câu hỏi");

            // Header styling
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.INDIGO.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            // Create headers row
            Row headerRow = sheet.createRow(0);
            String[] columns = {
                "STT", 
                "Loại câu hỏi (MULTIPLE_CHOICE / SHORT_ANSWER / ESSAY)", 
                "Nội dung câu hỏi", 
                "Điểm số", 
                "Các lựa chọn (Trắc nghiệm - phân tách bằng |)", 
                "Đáp án đúng / Từ khóa", 
                "Phân biệt chữ hoa/thường (Trả lời ngắn - YES/NO)"
            };
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            // Create 3 mock data rows for different types
            Object[][] mockData = {
                {1, "MULTIPLE_CHOICE", "Thủ đô của Việt Nam là gì?", 2.0, "A: Hà Nội | B: TP. Hồ Chí Minh | C: Đà Nẵng | D: Hải Phòng", "A", "NO"},
                {2, "SHORT_ANSWER", "Ngôn ngữ lập trình chính thức được Google khuyến khích sử dụng cho phát triển Android là gì?", 1.5, "", "Kotlin, Java", "NO"},
                {3, "ESSAY", "Trình bày ưu điểm và nhược điểm của việc sử dụng AI trong chấm điểm học sinh.", 5.0, "", "", ""}
            };

            for (int r = 0; r < mockData.length; r++) {
                Row row = sheet.createRow(r + 1);
                for (int c = 0; c < mockData[r].length; c++) {
                    Cell cell = row.createCell(c);
                    Object val = mockData[r][c];
                    if (val instanceof Integer) {
                        cell.setCellValue((Integer) val);
                    } else if (val instanceof Double) {
                        cell.setCellValue((Double) val);
                    } else {
                        cell.setCellValue((String) val);
                    }
                }
            }

            // Auto size columns
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    @Override
    public List<Map<String, Object>> importQuestionsFromExcel(org.springframework.web.multipart.MultipartFile file) throws Exception {
        return QuestionExcelParser.parseQuestions(file);
    }
}
