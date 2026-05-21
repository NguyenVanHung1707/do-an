package com.example.backend.controller;

import com.example.backend.dto.AttendanceLogDto;
import com.example.backend.dto.CourseDto;
import com.example.backend.dto.FormDto;
import com.example.backend.dto.QuestionDto;
import com.example.backend.service.TeacherService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teacher")
public class TeacherController {
    private final TeacherService teacherService;

    public TeacherController(TeacherService teacherService) {
        this.teacherService = teacherService;
    }
    @PostMapping("/create-course")
    public ResponseEntity<?> createCourse(@RequestBody CourseDto courseDto, @AuthenticationPrincipal Jwt jwt){
        System.out.println("id: " + jwt.getClaimAsString("sub")); //sub is the keycloak id
        teacherService.createCourse(courseDto, jwt.getClaimAsString("sub"));
        return ResponseEntity.ok("Course created successfully");
    }

    @PostMapping("/add-student-to-course")
    public ResponseEntity<?> addStudentToCourse(@AuthenticationPrincipal Jwt jwt, @RequestParam Long courseId, @RequestParam Long studentId){
        teacherService.addStudentToCourse(courseId, studentId, jwt.getClaimAsString("sub"));
        return ResponseEntity.ok("Student added to course successfully");
    }
    @PostMapping("/add-attendance")
    public ResponseEntity<?> addAttendance(@RequestBody AttendanceLogDto attendanceLogDto){
        teacherService.addAttendance(attendanceLogDto);
        return ResponseEntity.ok("Attendance added successfully");
    }
    @GetMapping("/get-my-courses")
    public ResponseEntity<?> getMyCourses(@AuthenticationPrincipal Jwt jwt){
        return ResponseEntity.ok(teacherService.getMyCourses(jwt.getClaimAsString("sub")));
    }
    @DeleteMapping("/delete-student-from-course")
    public ResponseEntity<?> deleteStudentFromCourse(@RequestParam Long courseId, @RequestParam Long studentId, @AuthenticationPrincipal Jwt jwt){
        teacherService.deleteStudentFromCourse(courseId, studentId, jwt.getClaimAsString("sub"));
        return ResponseEntity.ok("Student deleted from course successfully");
    }
    @DeleteMapping("/delete-attendance")
    public ResponseEntity<?> deleteAttendance(@RequestParam Long attendanceId, @AuthenticationPrincipal Jwt jwt){
        teacherService.deleteAttendance(attendanceId, jwt.getClaimAsString("sub"));
        return ResponseEntity.ok("Attendance deleted successfully");
    }
    @PostMapping("/create-question")
    public ResponseEntity<?> createQuestion(@RequestParam Long courseId, @RequestBody QuestionDto questionDto, @AuthenticationPrincipal Jwt jwt){
        teacherService.createQuestion(courseId, questionDto, jwt.getClaimAsString("sub"));
        return ResponseEntity.ok("Question created successfully");
    }
    @DeleteMapping("/delete-question")
    public ResponseEntity<?> deleteQuestion(@RequestParam Long questionId, @AuthenticationPrincipal Jwt jwt){
        teacherService.deleteQuestion(questionId, jwt.getClaimAsString("sub"));
        return ResponseEntity.ok("Question deleted successfully");
    }
    @DeleteMapping("/delete-answer")
    public ResponseEntity<?> deleteAnswer(@RequestParam Long answerId, @AuthenticationPrincipal Jwt jwt){
        teacherService.deleteAnswer(answerId, jwt.getClaimAsString("sub"));
        return ResponseEntity.ok("Answer deleted successfully");
    }
    @PutMapping("/update-answer")
    public ResponseEntity<?> updateAnswer(@RequestParam Long answerId, @RequestParam String content, @AuthenticationPrincipal Jwt jwt){
        teacherService.updateAnswer(answerId, content, jwt.getClaimAsString("sub"));
        return ResponseEntity.ok("Answer updated successfully");
    }
    @GetMapping("/get-all-question-of-course")
    public ResponseEntity<List<?>> getAllQuestionOfCourse(@RequestParam Long courseId){
        return ResponseEntity.ok(teacherService.getAllQuestionOfCourse(courseId));
    }
    @GetMapping("/get-all-answer-of-question")
    public ResponseEntity<List<?>> getAllAnswerOfQuestion(@RequestParam Long questionId){
        return ResponseEntity.ok(teacherService.getAllAnswerOfQuestion(questionId));
    }
    @PutMapping("/update-question")
    public ResponseEntity<?> updateQuestion(@RequestParam Long questionId, @RequestParam String content, @AuthenticationPrincipal Jwt jwt){
        teacherService.updateQuestion(questionId, content, jwt.getClaimAsString("sub"));
        return ResponseEntity.ok("Question updated successfully");
    }
    @GetMapping("/get-all-student-of-course")
    public ResponseEntity<List<?>> getAllStudentOfCourse(@RequestParam Long courseId, @AuthenticationPrincipal Jwt jwt){
        return ResponseEntity.ok(teacherService.getAllStudentOfCourse(courseId, jwt.getClaimAsString("sub")));
    }
    @GetMapping("/get-all-attendance-of-student-of-course")
    public ResponseEntity<List<?>> getAllAttendanceOfStudentOfCourse(@RequestParam Long courseId, @RequestParam Long studentId, @AuthenticationPrincipal Jwt jwt){
        return ResponseEntity.ok(teacherService.getAllAttendanceOfStudentOfCourse(courseId, studentId, jwt.getClaimAsString("sub")));
    }
    @PutMapping("/update-course")
    public ResponseEntity<?> updateCourse(@RequestParam Long courseId, @RequestBody CourseDto courseDto, @AuthenticationPrincipal Jwt jwt){
        teacherService.updateCourse(courseId, courseDto, jwt.getClaimAsString("sub"));
        return ResponseEntity.ok("Course updated successfully");
    }
    @DeleteMapping("/delete-course")
    public ResponseEntity<?> deleteCourse(@RequestParam Long courseId, @AuthenticationPrincipal Jwt jwt){
        teacherService.deleteCourse(courseId, jwt.getClaimAsString("sub"));
        return ResponseEntity.ok("Course deleted successfully");
    }
    @GetMapping("/search-student")
    public ResponseEntity<List<?>> searchStudent(@RequestParam String name){
        return ResponseEntity.ok(teacherService.searchStudent(name));
    }
    @PostMapping("/create-form")
    public ResponseEntity<?> createForm(@RequestParam Long courseId, @RequestBody FormDto formDto, @AuthenticationPrincipal Jwt jwt){
        return ResponseEntity.ok(teacherService.createForm(courseId, formDto, jwt.getClaimAsString("sub")));
    }
    @GetMapping("/get-form-by-course")
    public ResponseEntity<?> getFormByCourse(@RequestParam Long courseId, @AuthenticationPrincipal Jwt jwt){
        return ResponseEntity.ok(teacherService.getFormByCourse(courseId));
    }
    @DeleteMapping("/delete-form-by-course")
    public ResponseEntity<?> deleteForm(@RequestParam Long courseId, @AuthenticationPrincipal Jwt jwt){
        teacherService.deleteForm(courseId, jwt.getClaimAsString("sub"));
        return ResponseEntity.ok("Form deleted successfully");
    }
    @GetMapping("/get-my-class-chart")
    public ResponseEntity<List<?>> getMyClassChart(@AuthenticationPrincipal Jwt jwt){
        return ResponseEntity.ok(teacherService.getMyClassChart(jwt.getClaimAsString("sub")));
    }
    @GetMapping("/get-rate-of-my-class-chart")
    public ResponseEntity<List<?>> getRateOfMyClassChart(@AuthenticationPrincipal Jwt jwt){
        return ResponseEntity.ok(teacherService.getRateOfMyClassChart(jwt.getClaimAsString("sub")));
    }
}
