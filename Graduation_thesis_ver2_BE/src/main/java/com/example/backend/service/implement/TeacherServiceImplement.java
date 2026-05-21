package com.example.backend.service.implement;

import com.example.backend.dto.*;
import com.example.backend.entity.*;
import com.example.backend.exception.CustomException;
import com.example.backend.repository.*;
import com.example.backend.service.TeacherService;
import com.example.backend.service.Utility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class TeacherServiceImplement implements TeacherService {
    private final TeacherRepository teacherRepository;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final RegisterRepository registerRepository;
    private final AttendanceLogRepository attendanceLogRepository;
    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final FormRepository formRepository;



    public TeacherServiceImplement(TeacherRepository teacherRepository, CourseRepository courseRepository, StudentRepository studentRepository, RegisterRepository registerRepository, AttendanceLogRepository attendanceLogRepository, QuestionRepository questionRepository, AnswerRepository answerRepository, FormRepository formRepository) {
        this.teacherRepository = teacherRepository;
        this.courseRepository = courseRepository;
        this.studentRepository = studentRepository;
        this.registerRepository = registerRepository;
        this.attendanceLogRepository = attendanceLogRepository;
        this.questionRepository = questionRepository;
        this.answerRepository = answerRepository;
        this.formRepository = formRepository;
    }
    @Override
    public Teacher createTeacher(TeacherDto teacherDto) {
        if(teacherDto.getTeacherCode() == null && teacherDto.getKeycloakId() ==null){
            throw new CustomException("Teacher code and keycloak id is required", HttpStatus.BAD_REQUEST);
        }
        Teacher teacher = new Teacher();
        teacher.setTeacherCode(teacherDto.getTeacherCode());
        teacher.setKeycloakId(teacherDto.getKeycloakId());
        if(teacherDto.getName() != null){
            teacher.setName(teacherDto.getName());
        }
        if(teacherDto.getIsActive() != null){
            teacher.setIsActive(teacherDto.getIsActive());
        }
        teacher.setCreatedAt(OffsetDateTime.now());
        teacher.setUpdatedAt(OffsetDateTime.now());
        return teacherRepository.save(teacher);
    }

    @Override
    public Teacher getTeacherById(Long id) {
        if (teacherRepository.findById(id).isPresent()){
            return teacherRepository.findById(id).get();
        }else {
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
    }

    @Override
    public Teacher updateTeacher(Long id, TeacherDto teacherDto) {
        if(teacherRepository.findById(id).isEmpty()){
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        Teacher teacher = teacherRepository.findById(id).get();
        if(teacherDto.getTeacherCode() != null){
            teacher.setTeacherCode(teacherDto.getTeacherCode());
        }
        if(teacherDto.getName() != null){
            teacher.setName(teacherDto.getName());
        }
        if(teacherDto.getIsActive() != null){
            teacher.setIsActive(teacherDto.getIsActive());
        }
        teacher.setUpdatedAt(OffsetDateTime.now());
        return teacherRepository.save(teacher);
    }

    @Override
    public void deleteTeacher(Long id) {
        if(teacherRepository.findById(id).isEmpty()){
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        teacherRepository.deleteById(id);
    }

    @Override
    public Page<Teacher> getAllTeachers(int page, int size) {
        return teacherRepository.findAll(PageRequest.of(page, size));
    }

    @Override
    public void createCourse(CourseDto courseDto, String teacherKeycloakId) {
        Optional<Teacher> teacher = teacherRepository.findByKeycloakId(teacherKeycloakId);
        if(teacher.isEmpty()){
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        Course course = new Course();
        course.setCourseCode(courseDto.getCourseCode());
        course.setSubject(courseDto.getSubject());
        course.setTeacher(teacher.get());
        course.setCreatedAt(OffsetDateTime.now());
        course.setUpdatedAt(OffsetDateTime.now());
        course.setDescription(courseDto.getDescription());
        course.setIsActive(true);
        courseRepository.save(course);
    }

    @Override
    public void addStudentToCourse(Long courseId, Long studentId, String teacherKeycloakId) {
        Optional<Course> course = courseRepository.findById(courseId);
        if(course.isEmpty()){
            throw new CustomException("Course not found", HttpStatus.NOT_FOUND);
        }
        Optional<Student> student = studentRepository.findById(studentId);
        if(student.isEmpty()){
            throw new CustomException("Student not found", HttpStatus.NOT_FOUND);
        }
        RegisterId registerId = new RegisterId();
        registerId.setStudent(student.get());
        registerId.setCourse(course.get());
        Optional<Register> registerOptional = registerRepository.findById(registerId);
        if(registerOptional.isPresent()){
            throw new CustomException("Student already registered to this course", HttpStatus.BAD_REQUEST);
        }
        //check if course is mine
        Optional<Teacher> teacher = teacherRepository.findByKeycloakId(teacherKeycloakId);
        if(teacher.isEmpty()){
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        if(!course.get().getTeacher().equals(teacher.get())){
            throw new CustomException("Course is not yours", HttpStatus.BAD_REQUEST);
        }

        // Add student to course
        Register register = new Register();
        register.setId(registerId);
        register.setNumberOfAbsence(0);
        register.setNumberOfAttendance(0);
        registerRepository.save(register);
    }

    @Override
    public void addAttendance(AttendanceLogDto attendanceLogDto) {
        Optional<Student> student = studentRepository.findById(attendanceLogDto.getStudentId());
        if(student.isEmpty()){
            throw new CustomException("Student not found", HttpStatus.NOT_FOUND);
        }
        Optional<Course> course = courseRepository.findById(attendanceLogDto.getCourseId());
        if(course.isEmpty()){
            throw new CustomException("Course not found", HttpStatus.NOT_FOUND);
        }
        //check if student is registered to the course
        RegisterId registerId = new RegisterId();
        registerId.setStudent(student.get());
        registerId.setCourse(course.get());
        Optional<Register> registerOptional = registerRepository.findById(registerId);
        if(registerOptional.isEmpty()){
            throw new CustomException("Student is not registered to this course", HttpStatus.BAD_REQUEST);
        }
        //check if lecture number is exist then update attendance instead of create new attendance
        List<AttendanceLog> attendanceLogs = attendanceLogRepository.findByStudentAndCourseAndLectureNumber(student.get(), course.get(), attendanceLogDto.getLectureNumber());
        if(!attendanceLogs.isEmpty()){
            AttendanceLog attendanceLog = attendanceLogs.getFirst();
            attendanceLog.setIsAttendance(attendanceLogDto.getIsAttendance());
            attendanceLog.setAttendanceTime(attendanceLogDto.getAttendanceTime());
            attendanceLogRepository.save(attendanceLog);
            return;
        }
        AttendanceLog attendanceLog = new AttendanceLog();
        attendanceLog.setStudent(student.get());
        attendanceLog.setCourse(course.get());
        attendanceLog.setAttendanceTime(attendanceLogDto.getAttendanceTime());
        attendanceLog.setIsAttendance(attendanceLogDto.getIsAttendance());
        attendanceLog.setLectureNumber(attendanceLogDto.getLectureNumber());
        attendanceLogRepository.save(attendanceLog);
        //update number of attendance and number of absence by call procedure
        teacherRepository.updateAttendanceCount(course.get().getId(), student.get().getId());
    }

    @Override
    public List<Course> getMyCourses(String teacherKeycloakId) {
        Optional<Teacher> teacher = teacherRepository.findByKeycloakId(teacherKeycloakId);
        if(teacher.isEmpty()){
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        List<Course> courses = courseRepository.findByTeacher(teacher.get());
        List<Course> response = new ArrayList<>();
        for (Course course: courses){
            Course courseWithoutTeacher = new Course();
            courseWithoutTeacher.setId(course.getId());
            courseWithoutTeacher.setCourseCode(course.getCourseCode());
            courseWithoutTeacher.setSubject(course.getSubject());
            courseWithoutTeacher.setCreatedAt(course.getCreatedAt());
            courseWithoutTeacher.setUpdatedAt(course.getUpdatedAt());
            courseWithoutTeacher.setIsActive(course.getIsActive());
            courseWithoutTeacher.setDescription(course.getDescription());
            response.add(courseWithoutTeacher);
        }
        return response;
    }

    @Override
    public void deleteStudentFromCourse(Long courseId, Long studentId, String teacherKeycloakId) {
        Optional<Course> course = courseRepository.findById(courseId);
        if(course.isEmpty()){
            throw new CustomException("Course not found", HttpStatus.NOT_FOUND);
        }
        Optional<Student> student = studentRepository.findById(studentId);
        if(student.isEmpty()){
            throw new CustomException("Student not found", HttpStatus.NOT_FOUND);
        }
        //check if student is registered to the course
        RegisterId registerId = new RegisterId();
        registerId.setStudent(student.get());
        registerId.setCourse(course.get());
        Optional<Register> registerOptional = registerRepository.findById(registerId);
        if(registerOptional.isEmpty()){
            throw new CustomException("Student is not registered to this course", HttpStatus.BAD_REQUEST);
        }
        //check if course is mine
        Optional<Teacher> teacher = teacherRepository.findByKeycloakId(teacherKeycloakId);
        if(teacher.isEmpty()){
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        if(!course.get().getTeacher().equals(teacher.get())){
            throw new CustomException("Course is not yours", HttpStatus.BAD_REQUEST);
        }
        registerRepository.deleteById(registerId);
        //delete all attendance of student in this course
        List<AttendanceLog> attendanceLogs = attendanceLogRepository.findByStudentAndCourse(student.get(), course.get());
        for(AttendanceLog attendanceLog: attendanceLogs){
            attendanceLogRepository.deleteById(attendanceLog.getId());
        }
    }

    @Override
    public void deleteAttendance(Long attendanceId, String teacherKeycloakId) {
        Optional<AttendanceLog> attendanceLog = attendanceLogRepository.findById(attendanceId);
        if(attendanceLog.isEmpty()){
            throw new CustomException("Attendance not found", HttpStatus.NOT_FOUND);
        }
        //check if course is mine
        Optional<Teacher> teacher = teacherRepository.findByKeycloakId(teacherKeycloakId);
        if(teacher.isEmpty()){
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        if(!attendanceLog.get().getCourse().getTeacher().equals(teacher.get())){
            throw new CustomException("Course is not yours", HttpStatus.BAD_REQUEST);
        }
        attendanceLogRepository.deleteById(attendanceId);
    }

    @Override
    public void createQuestion(Long courseId, QuestionDto questionDto, String teacherKeycloakId) {

    }

    @Override
    public void deleteQuestion(Long questionId, String teacherKeycloakId) {

    }

    @Override
    public void deleteAnswer(Long answerId, String teacherKeycloakId) {

    }

    @Override
    public void updateAnswer(Long answerId, String content, String teacherKeycloakId) {

    }

    @Override
    public List<?> getAllQuestionOfCourse(Long courseId) {
        return List.of();
    }

    @Override
    public List<?> getAllAnswerOfQuestion(Long questionId) {
        return List.of();
    }

    @Override
    public void updateQuestion(Long questionId, String content, String teacherKeycloakId) {

    }

    @Override
    public List<StudentInCourseDto> getAllStudentOfCourse(Long courseId, String teacherKeycloakId) {
        Optional<Course> course = courseRepository.findById(courseId);
        if(course.isEmpty()){
            throw new CustomException("Course not found", HttpStatus.NOT_FOUND);
        }
        //check if course is mine
        Optional<Teacher> teacher = teacherRepository.findByKeycloakId(teacherKeycloakId);
        if(teacher.isEmpty()){
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        if(!course.get().getTeacher().equals(teacher.get())){
            throw new CustomException("Course is not yours", HttpStatus.BAD_REQUEST);
        }
        List<Register> registers = registerRepository.findByIdCourse(course.get());
        List<StudentInCourseDto> response = new ArrayList<>();
        for(Register register: registers){
            StudentInCourseDto studentInCourseDto = new StudentInCourseDto();
            studentInCourseDto.setId(register.getId().getStudent().getId());
            studentInCourseDto.setStudentCode(register.getId().getStudent().getStudentCode());
            studentInCourseDto.setName(register.getId().getStudent().getName());
            studentInCourseDto.setCourseCode(register.getId().getCourse().getCourseCode());
            studentInCourseDto.setNumberOfAbsent(register.getNumberOfAbsence());
            studentInCourseDto.setNumberOfPresent(register.getNumberOfAttendance());
            response.add(studentInCourseDto);
        }
        return response;
    }

    @Override
    public List<?> getAllAttendanceOfStudentOfCourse(Long courseId, Long studentId, String teacherKeycloakId) {
        Optional<Course> course = courseRepository.findById(courseId);
        if(course.isEmpty()){
            throw new CustomException("Course not found", HttpStatus.NOT_FOUND);
        }
        Optional<Student> student = studentRepository.findById(studentId);
        if(student.isEmpty()){
            throw new CustomException("Student not found", HttpStatus.NOT_FOUND);
        }
        //check if course is mine
        Optional<Teacher> teacher = teacherRepository.findByKeycloakId(teacherKeycloakId);
        if(teacher.isEmpty()){
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        if(!course.get().getTeacher().equals(teacher.get())){
            throw new CustomException("Course is not yours", HttpStatus.BAD_REQUEST);
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
    public void updateCourse(Long courseId, CourseDto courseDto, String sub) {
        Optional<Course> course = courseRepository.findById(courseId);
        if(course.isEmpty()){
            throw new CustomException("Course not found", HttpStatus.NOT_FOUND);
        }
        //check if course is mine
        Optional<Teacher> teacher = teacherRepository.findByKeycloakId(sub);
        if(teacher.isEmpty()){
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        if(!course.get().getTeacher().equals(teacher.get())){
            throw new CustomException("Course is not yours", HttpStatus.BAD_REQUEST);
        }
        if(courseDto.getCourseCode() != null){
            course.get().setCourseCode(courseDto.getCourseCode());
        }
        if(courseDto.getSubject() != null){
            course.get().setSubject(courseDto.getSubject());
        }
        course.get().setDescription(courseDto.getDescription());
        course.get().setUpdatedAt(OffsetDateTime.now());
        courseRepository.save(course.get());
    }

    @Override
    public void deleteCourse(Long courseId, String sub) {
        Optional<Course> course = courseRepository.findById(courseId);
        if(course.isEmpty()){
            throw new CustomException("Course not found", HttpStatus.NOT_FOUND);
        }
        //check if course is mine
        Optional<Teacher> teacher = teacherRepository.findByKeycloakId(sub);
        if(teacher.isEmpty()){
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        if(!course.get().getTeacher().equals(teacher.get())){
            throw new CustomException("Course is not yours", HttpStatus.BAD_REQUEST);
        }
        courseRepository.deleteById(courseId);
    }

    @Override
    public List<?> searchStudent(String name) {
        List<Student> students = studentRepository.findByNameContaining(name);
        //get top 5
        if(students.size() > 5){
            students = students.subList(0, 5);
        }
        return students;
    }

    @Override
    public String createForm(Long courseId, FormDto formDto, String sub) {
        Optional<Course> course = courseRepository.findById(courseId);
        if(course.isEmpty()){
            throw new CustomException("Course not found", HttpStatus.NOT_FOUND);
        }
        //check if course is mine
        Optional<Teacher> teacher = teacherRepository.findByKeycloakId(sub);
        if(teacher.isEmpty()){
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        if(!course.get().getTeacher().equals(teacher.get())){
            throw new CustomException("Course is not yours", HttpStatus.BAD_REQUEST);
        }
        //check if course has form
        Optional<Form> formOptional = formRepository.findFirstByCourse(course.get());
        formOptional.ifPresent(form -> formRepository.deleteById(form.getId()));
        Form form = new Form();
        form.setLectureNumber(formDto.getLectureNumber());
        //set expiredAt = now + timeOfPeriod (unit: second)
        form.setExpiredAt(OffsetDateTime.now().plusSeconds(formDto.getTimeOfPeriod()));
        String uniqueCode;
        do{
            uniqueCode = Utility.generateRandomString(8);
        }while (formRepository.findByCode(uniqueCode).isPresent());
        form.setCode(uniqueCode);
        form.setCourse(course.get());
        form.setLatitude(formDto.getLatitude());
        form.setLongitude(formDto.getLongitude());
        formRepository.save(form);
        for(QuestionDto questionDto: formDto.getQuestions()){
            Question question = new Question();
            question.setContent(questionDto.getContent());
            question.setForm(form);
            questionRepository.save(question);
            for(AnswerDto answerDto: questionDto.getAnswers()){
                Answer answer = new Answer();
                answer.setContent(answerDto.getContent());
                answer.setIsTrue(answerDto.getIsTrue());
                answer.setQuestion(question);
                answerRepository.save(answer);
            }
        }
        return form.getCode();
    }

    @Override
    public FormDto getFormByCourse(Long courseId) {
        Optional<Course> course = courseRepository.findById(courseId);
        if(course.isEmpty()){
            throw new CustomException("Course not found", HttpStatus.NOT_FOUND);
        }
        Optional<Form> form = formRepository.findFirstByCourse(course.get());
        if(form.isEmpty()){
            throw new CustomException("Form not found", HttpStatus.NOT_FOUND);
        }


        //check if expired
        if(form.get().getExpiredAt().isBefore(OffsetDateTime.now())){
            formRepository.deleteById(form.get().getId());
            throw new CustomException("Form is expired and will be deleted", HttpStatus.BAD_REQUEST);
        }
        FormDto formDto = new FormDto();
        formDto.setCode(form.get().getCode());
        formDto.setLectureNumber(form.get().getLectureNumber());
        formDto.setTimeOfPeriod(form.get().getExpiredAt().toEpochSecond() - OffsetDateTime.now().toEpochSecond());

        List<QuestionDto> questionDtos = new ArrayList<>();
        List<Question> questions = questionRepository.findByForm(form.get());
        for(Question question: questions){
            QuestionDto questionDto = new QuestionDto();
            questionDto.setContent(question.getContent());
            List<AnswerDto> answerDtos = new ArrayList<>();
            List<Answer> answers = answerRepository.findByQuestion(question);
            for(Answer answer: answers){
                AnswerDto answerDto = new AnswerDto();
                answerDto.setContent(answer.getContent());
                answerDto.setIsTrue(answer.getIsTrue());
                answerDtos.add(answerDto);
            }
            questionDto.setAnswers(answerDtos);
            questionDtos.add(questionDto);
        }
        formDto.setQuestions(questionDtos);
        return formDto;
    }

    @Override
    public void deleteForm(Long courseId, String sub) {
        Optional<Course> course = courseRepository.findById(courseId);
        if(course.isEmpty()){
            throw new CustomException("Course not found", HttpStatus.NOT_FOUND);
        }
        //check if course is mine
        Optional<Teacher> teacher = teacherRepository.findByKeycloakId(sub);
        if(teacher.isEmpty()){
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        if(!course.get().getTeacher().equals(teacher.get())){
            throw new CustomException("Course is not yours", HttpStatus.BAD_REQUEST);
        }
        Optional<Form> form = formRepository.findFirstByCourse(course.get());
        if(form.isEmpty()){
            throw new CustomException("Form not found", HttpStatus.NOT_FOUND);
        }
        formRepository.deleteById(form.get().getId());
    }

    @Override
    public List<BarChartDto> getMyClassChart(String sub) {
        Optional<Teacher> teacher = teacherRepository.findByKeycloakId(sub);
        if(teacher.isEmpty()){
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        List<Course> courses = courseRepository.findByTeacher(teacher.get());
        List<BarChartDto> response = new ArrayList<>();
        for(Course course: courses){
            BarChartDto barChartDto = new BarChartDto();
            barChartDto.setLabel(course.getCourseCode());
            barChartDto.setValue(registerRepository.countAllByIdCourse(course));
            response.add(barChartDto);
        }
        return response;
    }

    @Override
    public List<?> getRateOfMyClassChart(String sub) {
        Optional<Teacher> teacher = teacherRepository.findByKeycloakId(sub);
        if(teacher.isEmpty()){
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        //get rate of attendance of each course
        List<Course> courses = courseRepository.findByTeacher(teacher.get());
        List<BarChartDto> response = new ArrayList<>();
        for(Course course: courses){
            BarChartDto barChartDto = new BarChartDto();
            barChartDto.setLabel(course.getCourseCode());
            List<Register> registers = registerRepository.findByIdCourse(course);
            //calculate rate of attendance = sum of attendance / sum of attendance + sum of absence
            double sumOfAttendance = 0;
            double sumOfAbsence = 0;
            for(Register register: registers){
                sumOfAttendance += register.getNumberOfAttendance();
                sumOfAbsence += register.getNumberOfAbsence();
            }
            if(sumOfAttendance + sumOfAbsence == 0){
                //skip if no student in course
                continue;
            }
            barChartDto.setValue(sumOfAttendance / (sumOfAttendance + sumOfAbsence));
            response.add(barChartDto);
        }
        return response;
    }
}
