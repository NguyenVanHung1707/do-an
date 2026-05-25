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
    private final FormSubmissionRepository formSubmissionRepository;
    private final SemesterRepository semesterRepository;

    public TeacherServiceImplement(TeacherRepository teacherRepository, CourseRepository courseRepository, StudentRepository studentRepository, RegisterRepository registerRepository, AttendanceLogRepository attendanceLogRepository, QuestionRepository questionRepository, AnswerRepository answerRepository, FormRepository formRepository, FormSubmissionRepository formSubmissionRepository, SemesterRepository semesterRepository) {
        this.teacherRepository = teacherRepository;
        this.courseRepository = courseRepository;
        this.studentRepository = studentRepository;
        this.registerRepository = registerRepository;
        this.attendanceLogRepository = attendanceLogRepository;
        this.questionRepository = questionRepository;
        this.answerRepository = answerRepository;
        this.formRepository = formRepository;
        this.formSubmissionRepository = formSubmissionRepository;
        this.semesterRepository = semesterRepository;
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

        if (courseDto.getSemesterId() != null) {
            Optional<Semester> semester = semesterRepository.findById(courseDto.getSemesterId());
            if (semester.isPresent()) {
                course.setSemester(semester.get());
            }
        }

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
        register.setCanDownloadDocuments(true);
        register.setCanUploadDocuments(false);
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
            teacherRepository.updateAttendanceCount(course.get().getId(), student.get().getId());
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
            courseWithoutTeacher.setSemester(course.getSemester());
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
        Long courseId = attendanceLog.get().getCourse().getId();
        Long studentId = attendanceLog.get().getStudent().getId();
        attendanceLogRepository.deleteById(attendanceId);
        teacherRepository.updateAttendanceCount(courseId, studentId);
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

        if (courseDto.getSemesterId() != null) {
            Optional<Semester> semester = semesterRepository.findById(courseDto.getSemesterId());
            if (semester.isPresent()) {
                course.get().setSemester(semester.get());
            } else {
                course.get().setSemester(null);
            }
        } else {
            course.get().setSemester(null);
        }

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

    @Override
    public Teacher getTeacherByKeycloakId(String keycloakId) {
        return teacherRepository.findByKeycloakId(keycloakId)
                .orElseThrow(() -> new CustomException("Teacher not found with keycloak id: " + keycloakId, HttpStatus.NOT_FOUND));
    }

    @Override
    public List<FormWithSubmissionsDto> getFormsBySession(Long courseId, Integer lectureNumber, String sub) {
        Optional<Course> courseOpt = courseRepository.findById(courseId);
        if (courseOpt.isEmpty()) {
            throw new CustomException("Course not found", HttpStatus.NOT_FOUND);
        }
        Optional<Teacher> teacherOpt = teacherRepository.findByKeycloakId(sub);
        if (teacherOpt.isEmpty()) {
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        if (!courseOpt.get().getTeacher().equals(teacherOpt.get())) {
            throw new CustomException("Course is not yours", HttpStatus.BAD_REQUEST);
        }

        List<Form> forms = formRepository.findByCourseAndLectureNumber(courseOpt.get(), lectureNumber);
        List<FormWithSubmissionsDto> result = new ArrayList<>();

        for (Form form : forms) {
            FormWithSubmissionsDto dto = new FormWithSubmissionsDto();
            dto.setId(form.getId());
            dto.setCode(form.getCode());
            dto.setLectureNumber(form.getLectureNumber());
            dto.setExpiredAt(form.getExpiredAt());
            dto.setCreatedAt(form.getCreatedAt());
            dto.setLatitude(form.getLatitude());
            dto.setLongitude(form.getLongitude());

            // Get questions
            List<QuestionDto> questionDtos = new ArrayList<>();
            List<Question> questions = questionRepository.findByForm(form);
            for (Question question : questions) {
                QuestionDto questionDto = new QuestionDto();
                questionDto.setId(question.getId());
                questionDto.setContent(question.getContent());
                List<AnswerDto> answerDtos = new ArrayList<>();
                List<Answer> answers = answerRepository.findByQuestion(question);
                for (Answer answer : answers) {
                    AnswerDto answerDto = new AnswerDto();
                    answerDto.setId(answer.getId());
                    answerDto.setContent(answer.getContent());
                    answerDto.setIsTrue(answer.getIsTrue());
                    answerDtos.add(answerDto);
                }
                questionDto.setAnswers(answerDtos);
                questionDtos.add(questionDto);
            }
            dto.setQuestions(questionDtos);

            // Get successful students
            List<FormSubmission> submissions = formSubmissionRepository.findByFormAndIsCorrect(form, true);
            List<StudentInCourseDto> studentDtos = new ArrayList<>();
            for (FormSubmission subRecord : submissions) {
                Student s = subRecord.getStudent();
                StudentInCourseDto sDto = new StudentInCourseDto();
                sDto.setId(s.getId());
                sDto.setStudentCode(s.getStudentCode());
                sDto.setName(s.getName());
                studentDtos.add(sDto);
            }
            dto.setSuccessfulStudents(studentDtos);

            result.add(dto);
        }
        return result;
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void applyAttendanceRule(Long courseId, Integer lectureNumber, Integer minFormsRequired, String sub) {
        Optional<Course> courseOpt = courseRepository.findById(courseId);
        if (courseOpt.isEmpty()) {
            throw new CustomException("Course not found", HttpStatus.NOT_FOUND);
        }
        Optional<Teacher> teacherOpt = teacherRepository.findByKeycloakId(sub);
        if (teacherOpt.isEmpty()) {
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        if (!courseOpt.get().getTeacher().equals(teacherOpt.get())) {
            throw new CustomException("Course is not yours", HttpStatus.BAD_REQUEST);
        }

        Course course = courseOpt.get();
        List<Form> forms = formRepository.findByCourseAndLectureNumber(course, lectureNumber);
        if (forms.isEmpty()) {
            throw new CustomException("No forms found for this session", HttpStatus.BAD_REQUEST);
        }

        // Get all students registered in this course
        List<Register> registers = registerRepository.findByIdCourse(course);
        for (Register reg : registers) {
            Student student = reg.getId().getStudent();
            
            // Count successful submissions
            int successfulCount = 0;
            for (Form form : forms) {
                Optional<FormSubmission> submissionOpt = formSubmissionRepository.findByStudentAndForm(student, form);
                if (submissionOpt.isPresent() && Boolean.TRUE.equals(submissionOpt.get().getIsCorrect())) {
                    successfulCount++;
                }
            }

            boolean isAttendance = successfulCount >= minFormsRequired;

            // Delete old attendance log for this session and student
            List<AttendanceLog> oldLogs = attendanceLogRepository.findByStudentAndCourseAndLectureNumber(student, course, lectureNumber);
            attendanceLogRepository.deleteAll(oldLogs);

            // Create new attendance log
            AttendanceLog log = new AttendanceLog();
            log.setStudent(student);
            log.setCourse(course);
            log.setLectureNumber(lectureNumber);
            log.setIsAttendance(isAttendance);
            log.setAttendanceTime(OffsetDateTime.now());
            attendanceLogRepository.save(log);

            // Update registration attendance count (uses stored procedure)
            registerRepository.updateAttendanceCount(course.getId(), student.getId());
        }
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void deleteFormById(Long formId, String sub) {
        Optional<Form> formOpt = formRepository.findById(formId);
        if (formOpt.isEmpty()) {
            throw new CustomException("Form not found", HttpStatus.NOT_FOUND);
        }
        Course course = formOpt.get().getCourse();
        Optional<Teacher> teacherOpt = teacherRepository.findByKeycloakId(sub);
        if (teacherOpt.isEmpty()) {
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        if (!course.getTeacher().equals(teacherOpt.get())) {
            throw new CustomException("Course is not yours", HttpStatus.BAD_REQUEST);
        }

        formRepository.deleteById(formId);
    }

    @Override
    public List<StudentAttendancePreviewDto> previewAttendanceRule(Long courseId, Integer lectureNumber, Integer minFormsRequired, String sub) {
        Optional<Course> courseOpt = courseRepository.findById(courseId);
        if (courseOpt.isEmpty()) {
            throw new CustomException("Course not found", HttpStatus.NOT_FOUND);
        }
        Optional<Teacher> teacherOpt = teacherRepository.findByKeycloakId(sub);
        if (teacherOpt.isEmpty()) {
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        if (!courseOpt.get().getTeacher().equals(teacherOpt.get())) {
            throw new CustomException("Course is not yours", HttpStatus.BAD_REQUEST);
        }

        Course course = courseOpt.get();
        List<Form> forms = formRepository.findByCourseAndLectureNumber(course, lectureNumber);

        // Get all students registered in this course
        List<Register> registers = registerRepository.findByIdCourse(course);
        List<StudentAttendancePreviewDto> previewList = new ArrayList<>();

        for (Register reg : registers) {
            Student student = reg.getId().getStudent();
            
            // Current status
            List<AttendanceLog> currentLogs = attendanceLogRepository.findByStudentAndCourseAndLectureNumber(student, course, lectureNumber);
            String currentStatus = "N/A";
            if (!currentLogs.isEmpty()) {
                currentStatus = currentLogs.get(0).getIsAttendance() ? "PRESENT" : "ABSENT";
            }

            // Proposed status
            int successfulCount = 0;
            for (Form form : forms) {
                Optional<FormSubmission> submissionOpt = formSubmissionRepository.findByStudentAndForm(student, form);
                if (submissionOpt.isPresent() && Boolean.TRUE.equals(submissionOpt.get().getIsCorrect())) {
                    successfulCount++;
                }
            }
            String proposedStatus = (successfulCount >= minFormsRequired) ? "PRESENT" : "ABSENT";

            StudentAttendancePreviewDto dto = new StudentAttendancePreviewDto();
            dto.setStudentId(student.getId());
            dto.setStudentCode(student.getStudentCode());
            dto.setName(student.getName());
            dto.setCurrentStatus(currentStatus);
            dto.setProposedStatus(proposedStatus);
            previewList.add(dto);
        }
        return previewList;
    }

    @Override
    public List<StudentAttendancePreviewDto> previewAttendanceFace(Long courseId, Integer lectureNumber, List<Long> recognizedStudentIds, String sub) {
        Optional<Course> courseOpt = courseRepository.findById(courseId);
        if (courseOpt.isEmpty()) {
            throw new CustomException("Course not found", HttpStatus.NOT_FOUND);
        }
        Optional<Teacher> teacherOpt = teacherRepository.findByKeycloakId(sub);
        if (teacherOpt.isEmpty()) {
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        if (!courseOpt.get().getTeacher().equals(teacherOpt.get())) {
            throw new CustomException("Course is not yours", HttpStatus.BAD_REQUEST);
        }

        Course course = courseOpt.get();

        // Get all students registered in this course
        List<Register> registers = registerRepository.findByIdCourse(course);
        List<StudentAttendancePreviewDto> previewList = new ArrayList<>();

        for (Register reg : registers) {
            Student student = reg.getId().getStudent();
            
            // Current status
            List<AttendanceLog> currentLogs = attendanceLogRepository.findByStudentAndCourseAndLectureNumber(student, course, lectureNumber);
            String currentStatus = "N/A";
            if (!currentLogs.isEmpty()) {
                currentStatus = currentLogs.get(0).getIsAttendance() ? "PRESENT" : "ABSENT";
            }

            // Proposed status
            String proposedStatus = recognizedStudentIds.contains(student.getId()) ? "PRESENT" : "ABSENT";

            StudentAttendancePreviewDto dto = new StudentAttendancePreviewDto();
            dto.setStudentId(student.getId());
            dto.setStudentCode(student.getStudentCode());
            dto.setName(student.getName());
            dto.setCurrentStatus(currentStatus);
            dto.setProposedStatus(proposedStatus);
            previewList.add(dto);
        }
        return previewList;
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void confirmAttendanceChanges(ConfirmAttendanceChangesDto dto, String sub) {
        Optional<Course> courseOpt = courseRepository.findById(dto.getCourseId());
        if (courseOpt.isEmpty()) {
            throw new CustomException("Course not found", HttpStatus.NOT_FOUND);
        }
        Optional<Teacher> teacherOpt = teacherRepository.findByKeycloakId(sub);
        if (teacherOpt.isEmpty()) {
            throw new CustomException("Teacher not found", HttpStatus.NOT_FOUND);
        }
        if (!courseOpt.get().getTeacher().equals(teacherOpt.get())) {
            throw new CustomException("Course is not yours", HttpStatus.BAD_REQUEST);
        }

        Course course = courseOpt.get();

        for (StudentAttendanceChangeDto change : dto.getChanges()) {
            Optional<Student> studentOpt = studentRepository.findById(change.getStudentId());
            if (studentOpt.isEmpty()) {
                continue;
            }
            Student student = studentOpt.get();

            // Delete old attendance log for this session and student
            List<AttendanceLog> oldLogs = attendanceLogRepository.findByStudentAndCourseAndLectureNumber(student, course, dto.getLectureNumber());
            attendanceLogRepository.deleteAll(oldLogs);

            // Create new attendance log
            AttendanceLog log = new AttendanceLog();
            log.setStudent(student);
            log.setCourse(course);
            log.setLectureNumber(dto.getLectureNumber());
            log.setIsAttendance(change.getIsAttendance());
            log.setAttendanceTime(OffsetDateTime.now());
            attendanceLogRepository.save(log);

            // Update registration attendance count (uses stored procedure)
            registerRepository.updateAttendanceCount(course.getId(), student.getId());
        }
    }
}
