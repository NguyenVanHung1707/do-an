package com.example.backend.controller;

import com.example.backend.dto.WeightUpdateDto;
import com.example.backend.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/student/summary")
    public ResponseEntity<?> getStudentSummary(@AuthenticationPrincipal Jwt jwt,
                                               @RequestParam(required = false) Long semesterId) {
        try {
            String keycloakId = jwt.getClaimAsString("sub");
            return ResponseEntity.ok(analyticsService.getStudentSummary(keycloakId, semesterId));
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

    @GetMapping("/teacher/class/{courseId}/gradebook")
    public ResponseEntity<?> getTeacherClassGradebook(@PathVariable Long courseId) {
        try {
            return ResponseEntity.ok(analyticsService.getGradebook(courseId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/teacher/class/{courseId}/weights")
    public ResponseEntity<?> updateWeights(@PathVariable Long courseId,
                                           @RequestBody List<WeightUpdateDto> weightUpdates) {
        try {
            analyticsService.updateWeights(courseId, weightUpdates);
            return ResponseEntity.ok(Map.of("message", "Cập nhật hệ số điểm thành công!"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Có lỗi xảy ra: " + e.getMessage()));
        }
    }
}
