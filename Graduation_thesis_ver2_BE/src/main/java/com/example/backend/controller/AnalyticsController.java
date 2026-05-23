package com.example.backend.controller;

import com.example.backend.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/student/summary")
    public ResponseEntity<?> getStudentSummary(@AuthenticationPrincipal Jwt jwt) {
        try {
            String keycloakId = jwt.getClaimAsString("sub");
            return ResponseEntity.ok(analyticsService.getStudentSummary(keycloakId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/teacher/class/{courseId}")
    public ResponseEntity<?> getTeacherClassSummary(@PathVariable Long courseId) {
        try {
            return ResponseEntity.ok(analyticsService.getTeacherClassSummary(courseId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
