package com.example.backend.service.implement;

import com.example.backend.dto.*;
import com.example.backend.entity.*;
import com.example.backend.exception.CustomException;
import com.example.backend.repository.*;
import com.example.backend.service.StudentService;
import com.example.backend.util.GeoDistanceUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class StudentServiceImplement implements StudentService {
    private final StudentRepository studentRepository;
    private final FormRepository formRepository;
    private final RegisterRepository registerRepository;
    private final CourseRepository courseRepository;
    private final AttendanceLogRepository attendanceLogRepository;
    private final AnswerRepository answerRepository;
    private final FormSubmissionRepository formSubmissionRepository;

    @Value("${app.upload.dir:E:\\Data\\student_faces}")
    private String uploadDir;

    public StudentServiceImplement(StudentRepository studentRepository, FormRepository formRepository, RegisterRepository registerRepository, CourseRepository courseRepository, AttendanceLogRepository attendanceLogRepository, AnswerRepository answerRepository, FormSubmissionRepository formSubmissionRepository) {
        this.studentRepository = studentRepository;
        this.formRepository = formRepository;
        this.registerRepository = registerRepository;
        this.courseRepository = courseRepository;
        this.attendanceLogRepository = attendanceLogRepository;
        this.answerRepository = answerRepository;
        this.formSubmissionRepository = formSubmissionRepository;
    }


    @Override
    public Student createStudent(StudentDto studentDto) {
        if(studentDto.getStudentCode() == null || studentDto.getName() == null){
            throw new CustomException("Student code and name cannot be null", HttpStatusCode.valueOf(400));
        }
        if(studentDto.getIsActive() == null){
            studentDto.setIsActive(true);
        }
        Student student = new Student();
        student.setStudentCode(studentDto.getStudentCode());
        student.setName(studentDto.getName());
        student.setIsActive(studentDto.getIsActive());
        student.setCreatedAt(OffsetDateTime.now());
        student.setUpdatedAt(OffsetDateTime.now());
        return studentRepository.save(student);
    }

    @Override
    public Student getStudentById(Long id) {
        Optional<Student> student = studentRepository.findById(id);
        if(student.isEmpty()){
            throw new CustomException("StudentID not found", HttpStatus.NOT_FOUND);
        }
        return student.get();
    }

    @Override
    public Student updateStudent(Long id, StudentDto studentDto) {
        boolean isUpdated = false;
        Optional<Student> studentOptional = studentRepository.findById(id);
        if(studentOptional.isEmpty()){
//            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found");
            throw new CustomException("StudentID not found", HttpStatus.NOT_FOUND);
        }
        Student student = studentOptional.get();
        if(studentDto.getStudentCode() != null){
            student.setStudentCode(studentDto.getStudentCode());
            isUpdated = true;
        }
        if(studentDto.getName() != null){
            student.setName(studentDto.getName());
            isUpdated = true;
        }
        if(studentDto.getIsActive() != null){
            student.setIsActive(studentDto.getIsActive());
            isUpdated = true;
        }
        if(isUpdated){
            student.setUpdatedAt(OffsetDateTime.now());
        }
        return studentRepository.save(student);
    }

    @Override
    public void deleteStudent(Long id) {
        Optional<Student> student = studentRepository.findById(id);
        if(student.isEmpty()){
            throw new CustomException("StudentID not found", HttpStatus.NOT_FOUND);
        }
        studentRepository.deleteById(id);
    }

    @Override
    public Page<Student> getAllStudents(int pageNumber, int pageSize) {
        return studentRepository.findAll(PageRequest.of(pageNumber, pageSize));
    }

    @Override
    public FormDto getFormByCode(String code, String sub) {
        formRepository.findByCode(code).orElseThrow(() -> new CustomException("Form not found", HttpStatus.NOT_FOUND));
        //check if student is existed
        Optional<Student> student = studentRepository.findByKeycloakId(sub);
        if(student.isEmpty()){
            throw new CustomException("Student not found", HttpStatus.NOT_FOUND);
        }
        //get form by code
        Optional<Form> form = formRepository.findByCode(code);
        if(form.isEmpty()){
            throw new CustomException("Form not found", HttpStatus.NOT_FOUND);
        }
        //check if form is expired
        if(form.get().getExpiredAt().isBefore(OffsetDateTime.now())){
            throw new CustomException("Form is expired", HttpStatus.BAD_REQUEST);
        }
        //check if form is belong to student
        Course course = form.get().getCourse();
        RegisterId registerId = new RegisterId();
        registerId.setStudent(student.get());
        registerId.setCourse(course);
        Optional<Register> register = registerRepository.findById(registerId);
        if(register.isEmpty()){
            throw new CustomException("Form is not belong to student", HttpStatus.BAD_REQUEST);
        }
        //get form dto
        FormDto formDto = new FormDto();
        formDto.setCode(form.get().getCode());
        formDto.setLectureNumber(form.get().getLectureNumber());
        formDto.setLatitude(form.get().getLatitude());
        formDto.setLongitude(form.get().getLongitude());
        formDto.setIsLocationRequired(Boolean.TRUE.equals(form.get().getIsLocationRequired()));
        formDto.setAllowedRadiusMeters(form.get().getAllowedRadiusMeters());
        formDto.setExpiredAt(form.get().getExpiredAt());
        formDto.setCourseId(course.getId());
        formDto.setSubject(course.getSubject());
        formDto.setIsFaceVerificationRequired(Boolean.TRUE.equals(form.get().getIsFaceVerificationRequired()));
        List<QuestionDto> questionDtos = new ArrayList<>();
        //set question dto
        for(Question question : form.get().getQuestions()){
            QuestionDto questionDto = new QuestionDto();
            questionDto.setContent(question.getContent());
            questionDto.setId(question.getId());
            List<AnswerDto> answerDtos = new ArrayList<>();
            for(Answer answer : question.getAnswers()){
                AnswerDto answerDto = new AnswerDto();
                answerDto.setContent(answer.getContent());
                answerDto.setIsTrue(answer.getIsTrue());
                answerDto.setId(answer.getId());
                answerDtos.add(answerDto);
            }
            questionDto.setAnswers(answerDtos);
            questionDtos.add(questionDto);
        }
        formDto.setQuestions(questionDtos);
        return formDto;
    }

    @Override
    public List<AttendanceLogDto> getMyAttendance(String sub) {
        Optional<Student> student = studentRepository.findByKeycloakId(sub);
        if(student.isEmpty()){
            throw new CustomException("Student not found", HttpStatus.NOT_FOUND);
        }
        return new ArrayList<>();
    }

    @Override
    public List<?> getMyCourse(String sub) {
        Optional<Student> student = studentRepository.findByKeycloakId(sub);
        if(student.isEmpty()){
            throw new CustomException("Student not found", HttpStatus.NOT_FOUND);
        }
        List<CourseDto> response = new ArrayList<>();
        List<Register> registers = registerRepository.findByIdStudent(student.get());
        for(Register register : registers){
            Course course = register.getId().getCourse();
            CourseDto courseDto = new CourseDto();
            courseDto.setId(course.getId());
            courseDto.setCourseCode(course.getCourseCode());
            courseDto.setSubject(course.getSubject());
            courseDto.setDescription(course.getDescription());
            if (course.getSemester() != null) {
                courseDto.setSemesterId(course.getSemester().getId());
            }
            response.add(courseDto);
        }
        return response;
    }

    @Override
    public List<?> getMyAttendanceInACourse(Long courseId, String sub) {
        Optional<Student> student = studentRepository.findByKeycloakId(sub);
        if(student.isEmpty()){
            throw new CustomException("Student not found", HttpStatus.NOT_FOUND);
        }
        Optional<Course> course = courseRepository.findById(courseId);
        if(course.isEmpty()){
            throw new CustomException("Course not found", HttpStatus.NOT_FOUND);
        }
        List<AttendanceLog> attendanceLogs = attendanceLogRepository.findByStudentAndCourse(student.get(), course.get());
        List<AttendanceLog> response = new ArrayList<>();
        for(AttendanceLog attendanceLog: attendanceLogs){
            AttendanceLog attendanceLogWithoutStudentAndCourse = new AttendanceLog();
            attendanceLogWithoutStudentAndCourse.setId(attendanceLog.getId());
            attendanceLogWithoutStudentAndCourse.setAttendanceTime(attendanceLog.getAttendanceTime());
            attendanceLogWithoutStudentAndCourse.setIsAttendance(attendanceLog.getIsAttendance());
            attendanceLogWithoutStudentAndCourse.setLectureNumber(attendanceLog.getLectureNumber());
            response.add(attendanceLogWithoutStudentAndCourse);
        }
        return response;
    }

    @Override
    public AttendanceLog submitAnswer(StudentAnswerDto studentAnswerDto, String sub) {
        Optional<Student> student = studentRepository.findByKeycloakId(sub);
        if(student.isEmpty()){
            throw new CustomException("Student not found", HttpStatus.NOT_FOUND);
        }
        Optional<Form> form = formRepository.findByCode(studentAnswerDto.getCode());
        if(form.isEmpty()){
            throw new CustomException("Form not found", HttpStatus.NOT_FOUND);
        }
        if(form.get().getExpiredAt().isBefore(OffsetDateTime.now())){
            throw new CustomException("Form is expired", HttpStatus.BAD_REQUEST);
        }
        Course course = form.get().getCourse();
        RegisterId registerId = new RegisterId();
        registerId.setStudent(student.get());
        registerId.setCourse(course);
        Optional<Register> register = registerRepository.findById(registerId);
        if(register.isEmpty()){
            throw new CustomException("Form is not belong to student", HttpStatus.BAD_REQUEST);
        }
        Form formEntity = form.get();
        Student studentEntity = student.get();
        Double calculatedDistance = validateFormLocation(studentEntity, formEntity, studentAnswerDto);

        Boolean isFaceVerified = null;
        if (Boolean.TRUE.equals(formEntity.getIsFaceVerificationRequired())) {
            String base64Data = studentAnswerDto.getFaceImageBase64();
            if (base64Data == null || base64Data.trim().isEmpty()) {
                throw new CustomException("Vui lòng chụp ảnh khuôn mặt để xác thực chính chủ", HttpStatus.BAD_REQUEST);
            }
            
            byte[] imageBytes;
            try {
                if (base64Data.contains(",")) {
                    base64Data = base64Data.split(",")[1];
                }
                imageBytes = java.util.Base64.getDecoder().decode(base64Data);
            } catch (Exception e) {
                throw new CustomException("Định dạng ảnh khuôn mặt không hợp lệ", HttpStatus.BAD_REQUEST);
            }
            
            java.nio.file.Path tempDir = java.nio.file.Paths.get("./temp");
            java.nio.file.Path tempFilePath = null;
            try {
                java.nio.file.Files.createDirectories(tempDir);
                String tempFileName = "temp_submit_" + studentEntity.getId() + "_" + System.currentTimeMillis() + ".jpg";
                tempFilePath = tempDir.resolve(tempFileName);
                java.nio.file.Files.write(tempFilePath, imageBytes);
                
                org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.setContentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA);
                
                org.springframework.util.LinkedMultiValueMap<String, Object> map = new org.springframework.util.LinkedMultiValueMap<>();
                map.add("image_ids", String.valueOf(studentEntity.getId()));
                org.springframework.core.io.FileSystemResource fileResource = new org.springframework.core.io.FileSystemResource(tempFilePath.toFile());
                map.add("image_file", fileResource);
                
                org.springframework.http.HttpEntity<org.springframework.util.LinkedMultiValueMap<String, Object>> requestEntity = new org.springframework.http.HttpEntity<>(map, headers);
                
                String responseJson = restTemplate.postForObject("http://localhost:8888/attendance", requestEntity, String.class);
                System.out.println("[Face Verification] FastAPI response: " + responseJson);
                
                if (responseJson != null && (responseJson.contains("\"isAttendance\": true") || responseJson.contains("\"isAttendance\":true"))) {
                    isFaceVerified = true;
                } else {
                    isFaceVerified = false;
                }
            } catch (Exception e) {
                System.out.println("Error calling FastAPI for face verification: " + e.getMessage());
                isFaceVerified = false;
            } finally {
                if (tempFilePath != null) {
                    try {
                        java.nio.file.Files.deleteIfExists(tempFilePath);
                    } catch (Exception ignored) {}
                }
            }
            
            if (Boolean.FALSE.equals(isFaceVerified)) {
                FormSubmission submission = formSubmissionRepository.findByStudentAndForm(studentEntity, formEntity)
                        .orElse(new FormSubmission());
                submission.setStudent(studentEntity);
                submission.setForm(formEntity);
                submission.setIsCorrect(false);
                submission.setIsFaceVerified(false);
                submission.setSubmittedAt(OffsetDateTime.now());
                applyFormSubmissionLocationEvidence(submission, studentAnswerDto, calculatedDistance,
                        Boolean.TRUE.equals(formEntity.getIsLocationRequired()) ? true : null);
                formSubmissionRepository.save(submission);
                
                throw new CustomException("Xác thực khuôn mặt thất bại! Vui lòng chụp lại rõ khuôn mặt chính chủ để điểm danh.", HttpStatus.FORBIDDEN);
            }
        }

        List<AnswerDto> answers = studentAnswerDto.getAnswers();

        boolean isCorrect = true;

        for(AnswerDto answerDto : answers){
            Optional<Answer> answer = answerRepository.findById(answerDto.getId());
            if(answer.isEmpty()){
                throw new CustomException("Answer not found", HttpStatus.NOT_FOUND);
            }
            if(answer.get().getIsTrue() != answerDto.getIsTrue()){
                isCorrect = false;
                break;
            }
        }
        // Save or update FormSubmission
        FormSubmission submission = formSubmissionRepository.findByStudentAndForm(studentEntity, formEntity)
                .orElse(new FormSubmission());
        submission.setStudent(studentEntity);
        submission.setForm(formEntity);
        submission.setIsCorrect(isCorrect);
        submission.setIsFaceVerified(isFaceVerified);
        submission.setSubmittedAt(OffsetDateTime.now());
        applyFormSubmissionLocationEvidence(submission, studentAnswerDto, calculatedDistance,
                Boolean.TRUE.equals(formEntity.getIsLocationRequired()) ? true : null);
        formSubmissionRepository.save(submission);

        if (!isCorrect) {
            throw new CustomException("Answer is not correct", HttpStatus.BAD_REQUEST);
        }

        // Return a dummy AttendanceLog to satisfy the method signature without creating a DB record
        AttendanceLog dummyLog = new AttendanceLog();
        dummyLog.setStudent(studentEntity);
        dummyLog.setCourse(course);
        dummyLog.setIsAttendance(true);
        dummyLog.setLectureNumber(formEntity.getLectureNumber());
        dummyLog.setAttendanceTime(OffsetDateTime.now());
        return dummyLog;
    }

    private Double validateFormLocation(Student student, Form form, StudentAnswerDto dto) {
        boolean required = Boolean.TRUE.equals(form.getIsLocationRequired());

        if (Boolean.TRUE.equals(dto.getMockLocationDetected())) {
            saveFormSubmissionLocationFailure(student, form, dto, null, false);
            throw new CustomException("Thiết bị đang bật vị trí giả", HttpStatus.FORBIDDEN);
        }

        if (dto.getLatitude() == null || dto.getLongitude() == null) {
            if (required) {
                throw new CustomException("Vui lòng cấp quyền vị trí để tiếp tục", HttpStatus.BAD_REQUEST);
            }
            return null;
        }

        try {
            GeoDistanceUtils.validateCoordinates(dto.getLatitude(), dto.getLongitude());
        } catch (IllegalArgumentException ex) {
            throw new CustomException("Tọa độ không hợp lệ", HttpStatus.BAD_REQUEST);
        }

        if (!required) {
            return null;
        }

        if (form.getLatitude() == null || form.getLongitude() == null || form.getAllowedRadiusMeters() == null) {
            throw new CustomException("Cấu hình vị trí điểm danh không hợp lệ", HttpStatus.BAD_REQUEST);
        }

        double distance = GeoDistanceUtils.distanceMeters(
                form.getLatitude(),
                form.getLongitude(),
                dto.getLatitude(),
                dto.getLongitude()
        );
        if (distance > form.getAllowedRadiusMeters()) {
            saveFormSubmissionLocationFailure(student, form, dto, distance, false);
            throw new CustomException("Bạn không ở trong phạm vi lớp học", HttpStatus.FORBIDDEN);
        }

        return distance;
    }

    private void saveFormSubmissionLocationFailure(
            Student student,
            Form form,
            StudentAnswerDto dto,
            Double distance,
            Boolean validLocation
    ) {
        FormSubmission submission = formSubmissionRepository.findByStudentAndForm(student, form)
                .orElse(new FormSubmission());
        submission.setStudent(student);
        submission.setForm(form);
        submission.setIsCorrect(false);
        submission.setSubmittedAt(OffsetDateTime.now());
        applyFormSubmissionLocationEvidence(submission, dto, distance, validLocation);
        formSubmissionRepository.save(submission);
    }

    private void applyFormSubmissionLocationEvidence(
            FormSubmission submission,
            StudentAnswerDto dto,
            Double distance,
            Boolean validLocation
    ) {
        if (dto == null) {
            return;
        }
        submission.setMockLocationDetected(Boolean.TRUE.equals(dto.getMockLocationDetected()));
        if (dto.getLatitude() == null || dto.getLongitude() == null) {
            return;
        }
        submission.setStudentLatitude(dto.getLatitude());
        submission.setStudentLongitude(dto.getLongitude());
        submission.setCalculatedDistance(distance);
        submission.setIsValidLocation(validLocation);
    }

    @Override
    public void uploadMyImage(MultipartFile file, String sub) {
        Optional<Student> student = studentRepository.findByKeycloakId(sub);
        if(student.isEmpty()) {
            throw new CustomException("Student not found", HttpStatus.NOT_FOUND);
        }
        //upload image
        try {
            //save image
            Files.createDirectories(Paths.get(uploadDir));
            String extension = Objects.requireNonNull(file.getOriginalFilename()).substring(file.getOriginalFilename().lastIndexOf("."));
            String fileName = student.get().getId() + extension;
            java.nio.file.Path targetPath = Paths.get(uploadDir, fileName);
            Files.write(targetPath, file.getBytes());

            //update student image
            student.get().setImagePath(targetPath.toAbsolutePath().toString());
            studentRepository.save(student.get());
        } catch (Exception e){
            throw new CustomException("Upload image failed", HttpStatus.BAD_REQUEST);
        }
    }

    @Override
    public Object getMyImage(String sub) {
        Optional<Student> student = studentRepository.findByKeycloakId(sub);
        if(student.isEmpty()){
            throw new CustomException("Student not found", HttpStatus.NOT_FOUND);
        }
        //return image not image path
        if(student.get().getImagePath() != null){
            String imagePath = student.get().getImagePath();
            try {
                return Files.readAllBytes(Paths.get(imagePath));
            } catch (Exception e){
                throw new CustomException("Get image failed", HttpStatus.BAD_REQUEST);
            }
        }else {
            return null;
        }
    }

    @Override
    public java.util.Map<String, Object> getStudentProfileStatus(String sub, String defaultEmail, String defaultName) {
        java.util.Map<String, Object> status = new java.util.HashMap<>();
        Optional<Student> studentOpt = studentRepository.findByKeycloakId(sub);
        if (studentOpt.isEmpty()) {
            status.put("exists", false);
            status.put("profileCompleted", false);
            status.put("studentCode", null);
            status.put("name", defaultName);
            status.put("email", defaultEmail);
        } else {
            Student student = studentOpt.get();
            status.put("exists", true);
            boolean completed = student.getStudentCode() != null && !student.getStudentCode().trim().isEmpty();
            status.put("profileCompleted", completed);
            status.put("studentCode", student.getStudentCode());
            status.put("name", student.getName() != null ? student.getName() : defaultName);
            status.put("email", student.getEmail() != null ? student.getEmail() : defaultEmail);
        }
        return status;
    }

    @Override
    public Student completeStudentProfile(String sub, String studentCode, String name, String email) {
        if (studentCode == null || studentCode.trim().isEmpty()) {
            throw new CustomException("Mã số sinh viên (MSSV) là bắt buộc", HttpStatus.BAD_REQUEST);
        }
        Optional<Student> studentOpt = studentRepository.findByKeycloakId(sub);
        Student student;
        if (studentOpt.isEmpty()) {
            student = new Student();
            student.setKeycloakId(sub);
            student.setIsActive(true);
        } else {
            student = studentOpt.get();
        }
        student.setStudentCode(studentCode.trim());
        if (name != null && !name.trim().isEmpty()) {
            student.setName(name.trim());
        }
        if (email != null && !email.trim().isEmpty()) {
            student.setEmail(email.trim());
        }
        return studentRepository.save(student);
    }
}
