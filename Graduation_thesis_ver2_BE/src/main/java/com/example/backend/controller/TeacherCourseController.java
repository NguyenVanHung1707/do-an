package com.example.backend.controller;

import com.example.backend.dto.CourseScheduleDto;
import com.example.backend.entity.CourseSchedule;
import com.example.backend.service.CourseScheduleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teacher")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class TeacherCourseController {

    private final CourseScheduleService courseScheduleService;

    private boolean isTeacher(Jwt jwt) {
        if (jwt == null) return false;
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess != null && realmAccess.get("roles") instanceof List) {
            List<?> roles = (List<?>) realmAccess.get("roles");
            return roles.contains("teacher");
        }
        return false;
    }

    @PostMapping("/courses/{courseId}/schedules")
    public ResponseEntity<?> setCourseSchedules(
            @PathVariable Long courseId,
            @RequestBody List<CourseScheduleDto> schedules,
            @AuthenticationPrincipal Jwt jwt) {
        if (!isTeacher(jwt)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Từ chối truy cập: Yêu cầu quyền TEACHER!"));
        }
        try {
            List<CourseSchedule> savedSchedules = courseScheduleService.setCourseSchedules(courseId, schedules);
            return ResponseEntity.ok(savedSchedules);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/courses/{courseId}/schedules")
    public ResponseEntity<?> getCourseSchedules(
            @PathVariable Long courseId,
            @AuthenticationPrincipal Jwt jwt) {
        // Permit both teachers and students to view schedules
        try {
            List<CourseSchedule> schedules = courseScheduleService.getCourseSchedules(courseId);
            return ResponseEntity.ok(schedules);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
