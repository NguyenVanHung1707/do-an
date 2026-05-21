package com.example.backend.service.implement;

import com.example.backend.dto.*;
import com.example.backend.entity.*;
import com.example.backend.exception.CustomException;
import com.example.backend.repository.*;
import com.example.backend.service.StudentService;
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

    @Value("${app.upload.dir:E:\\Data\\student_faces}")
    private String uploadDir;

    public StudentServiceImplement(StudentRepository studentRepository, FormRepository formRepository, RegisterRepository registerRepository, CourseRepository courseRepository, AttendanceLogRepository attendanceLogRepository, AnswerRepository answerRepository) {
        this.studentRepository = studentRepository;
        this.formRepository = formRepository;
        this.registerRepository = registerRepository;
        this.courseRepository = courseRepository;
        this.attendanceLogRepository = attendanceLogRepository;
        this.answerRepository = answerRepository;
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
        formDto.setExpiredAt(form.get().getExpiredAt());
        formDto.setCourseId(course.getId());
        formDto.setSubject(course.getSubject());
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
        //check location
        if(form.get().getLatitude() != null && form.get().getLongitude() != null){
            if(studentAnswerDto.getLatitude() == null || studentAnswerDto.getLongitude() == null){
                throw new CustomException("Location is required", HttpStatus.BAD_REQUEST);
            }
            double distance = Math.sqrt(Math.pow(form.get().getLatitude() - studentAnswerDto.getLatitude(), 2) + Math.pow(form.get().getLongitude() - studentAnswerDto.getLongitude(), 2));
            if(distance > 0.0005){
                throw new CustomException("Location is not correct", HttpStatus.BAD_REQUEST);
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
        //delete old attendance log
        List<AttendanceLog> oldAttendanceLog = attendanceLogRepository.findByStudentAndCourseAndLectureNumber(student.get(), course, form.get().getLectureNumber());
        attendanceLogRepository.deleteAll(oldAttendanceLog);

        if(!isCorrect){
            AttendanceLog attendanceLog = new AttendanceLog();
            attendanceLog.setStudent(student.get());
            attendanceLog.setCourse(course);
            attendanceLog.setIsAttendance(false);
            attendanceLog.setLectureNumber(form.get().getLectureNumber());
            attendanceLog.setAttendanceTime(OffsetDateTime.now());
            attendanceLogRepository.save(attendanceLog);
            throw new CustomException("Answer is not correct", HttpStatus.BAD_REQUEST);
        }

        AttendanceLog attendanceLog = new AttendanceLog();
        attendanceLog.setStudent(student.get());
        attendanceLog.setCourse(course);
        attendanceLog.setIsAttendance(true);
        attendanceLog.setLectureNumber(form.get().getLectureNumber());
        attendanceLog.setAttendanceTime(OffsetDateTime.now());
        attendanceLogRepository.save(attendanceLog);
        return attendanceLog;
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
            throw new CustomException("Image not found", HttpStatus.NOT_FOUND);
        }
    }
}
