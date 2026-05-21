package com.example.backend.service;

import com.example.backend.dto.*;
import com.example.backend.entity.Course;
import com.example.backend.entity.Form;
import com.example.backend.entity.Teacher;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.List;


@Service
public interface TeacherService {
    Teacher createTeacher(TeacherDto teacherDto);
    Teacher getTeacherById(Long id);
    Teacher updateTeacher(Long id, TeacherDto teacherDto);
    void deleteTeacher(Long id);
    Page<Teacher> getAllTeachers(int page, int size);
    void createCourse(CourseDto courseDto, String teacherKeycloakId);
    void addStudentToCourse(Long courseId, Long studentId, String teacherKeycloakId);
    void addAttendance(AttendanceLogDto attendanceLogDto);
    List<Course> getMyCourses(String teacherKeycloakId);

    void deleteStudentFromCourse(Long courseId, Long studentId, String teacherKeycloakId);

    void deleteAttendance(Long attendanceId, String teacherKeycloakId);

    void createQuestion(Long courseId, QuestionDto questionDto, String teacherKeycloakId);

    void deleteQuestion(Long questionId, String teacherKeycloakId);

    void deleteAnswer(Long answerId, String teacherKeycloakId);

    void updateAnswer(Long answerId, String content, String teacherKeycloakId);

    List<?> getAllQuestionOfCourse(Long courseId);

    List<?> getAllAnswerOfQuestion(Long questionId);

    void updateQuestion(Long questionId, String content, String teacherKeycloakId);

    List<StudentInCourseDto> getAllStudentOfCourse(Long courseId, String teacherKeycloakId);

    List<?> getAllAttendanceOfStudentOfCourse(Long courseId, Long studentId, String teacherKeycloakId);

    void updateCourse(Long courseId, CourseDto courseDto, String sub);

    void deleteCourse(Long courseId, String sub);

    List<?> searchStudent(String name);

    String createForm(Long courseId, FormDto formDto, String sub);

    FormDto getFormByCourse(Long courseId);

    void deleteForm(Long courseId, String sub);

    List<BarChartDto> getMyClassChart(String sub);

    List<?> getRateOfMyClassChart(String sub);
}
