package com.example.backend.controller;

import com.example.backend.dto.StudentAnswerDto;
import com.example.backend.entity.Student;
import com.example.backend.service.StudentService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/student")
public class StudentController {
    private final StudentService studentService;
    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping("/user/student/all/{page}/{size}")
    public ResponseEntity<Page<Student>> getAllStudents(@PathVariable int page, @PathVariable int size){
        return ResponseEntity.ok(studentService.getAllStudents(page, size));
    }
    @GetMapping("/get-form-by-code")
    public ResponseEntity<?> getFormByCode(@RequestParam String code, @AuthenticationPrincipal Jwt jwt){
        return ResponseEntity.ok(studentService.getFormByCode(code, jwt.getClaimAsString("sub")));
    }
    @GetMapping("/get-my-course")
    public ResponseEntity<List<?>> getMyCourse(@AuthenticationPrincipal Jwt jwt){
        return ResponseEntity.ok(studentService.getMyCourse(jwt.getClaimAsString("sub")));
    }
    @GetMapping("/get-my-attendance-in-a-course")
    public ResponseEntity<List<?>> getMyAttendanceInACourse(@RequestParam Long courseId,@AuthenticationPrincipal Jwt jwt){
        return ResponseEntity.ok(studentService.getMyAttendanceInACourse(courseId,jwt.getClaimAsString("sub")));
    }
    @PostMapping("/submit-answer")
    public ResponseEntity<?> submitAnswer(@RequestBody StudentAnswerDto StudentAnswerDto, @AuthenticationPrincipal Jwt jwt){
        return ResponseEntity.ok(studentService.submitAnswer(StudentAnswerDto, jwt.getClaimAsString("sub")));
    }
    @PostMapping("/upload-my-image")
    public ResponseEntity<?> uploadMyImage(@RequestParam("file") MultipartFile file, @AuthenticationPrincipal Jwt jwt){
        studentService.uploadMyImage(file, jwt.getClaimAsString("sub"));
        return ResponseEntity.ok("Image uploaded successfully");
    }
    @GetMapping("/get-my-image")
    public ResponseEntity<?> getMyImage(@AuthenticationPrincipal Jwt jwt){
        return ResponseEntity.ok(studentService.getMyImage(jwt.getClaimAsString("sub")));
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@AuthenticationPrincipal Jwt jwt) {
        String sub = jwt.getClaimAsString("sub");
        String email = jwt.getClaimAsString("email");
        String name = jwt.getClaimAsString("name");
        if (name == null) {
            name = jwt.getClaimAsString("preferred_username");
        }
        return ResponseEntity.ok(studentService.getStudentProfileStatus(sub, email != null ? email : "", name != null ? name : ""));
    }

    @PostMapping("/complete-profile")
    public ResponseEntity<?> completeProfile(@RequestBody java.util.Map<String, String> payload, @AuthenticationPrincipal Jwt jwt) {
        String sub = jwt.getClaimAsString("sub");
        String studentCode = payload.get("studentCode");
        String name = payload.get("name");
        String email = payload.get("email");
        
        if (email == null || email.trim().isEmpty()) {
            email = jwt.getClaimAsString("email");
        }
        if (name == null || name.trim().isEmpty()) {
            name = jwt.getClaimAsString("name");
        }
        
        return ResponseEntity.ok(studentService.completeStudentProfile(sub, studentCode, name, email));
    }
}
