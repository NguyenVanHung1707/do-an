package com.example.backend.controller;

import com.example.backend.dto.SemesterDto;
import com.example.backend.entity.Semester;
import com.example.backend.entity.SemesterWeek;
import com.example.backend.service.SemesterService;
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
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AdminSemesterController {

    private final SemesterService semesterService;

    private boolean isAdmin(Jwt jwt) {
        if (jwt == null) return false;
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess != null && realmAccess.get("roles") instanceof List) {
            List<?> roles = (List<?>) realmAccess.get("roles");
            return roles.contains("admin");
        }
        return false;
    }

    // --- ADMIN ENDPOINTS ---

    @PostMapping("/admin/semesters")
    public ResponseEntity<?> createSemester(
            @RequestBody SemesterDto dto,
            @AuthenticationPrincipal Jwt jwt) {
        if (!isAdmin(jwt)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Từ chối truy cập: Yêu cầu quyền ADMIN!"));
        }
        try {
            Semester semester = semesterService.createSemester(dto);
            return ResponseEntity.ok(semester);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/admin/semesters/{id}")
    public ResponseEntity<?> updateSemester(
            @PathVariable Long id,
            @RequestBody SemesterDto dto,
            @AuthenticationPrincipal Jwt jwt) {
        if (!isAdmin(jwt)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Từ chối truy cập: Yêu cầu quyền ADMIN!"));
        }
        try {
            Semester semester = semesterService.updateSemester(id, dto);
            return ResponseEntity.ok(semester);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/admin/semesters/{id}/active")
    public ResponseEntity<?> setActiveSemester(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        if (!isAdmin(jwt)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Từ chối truy cập: Yêu cầu quyền ADMIN!"));
        }
        try {
            semesterService.setActiveSemester(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Kích hoạt học kỳ thành công!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // --- SHARED ENDPOINTS (Permitted for Teachers & Students) ---

    @GetMapping("/semesters")
    public ResponseEntity<?> getAllSemesters() {
        return ResponseEntity.ok(semesterService.getAllSemesters());
    }

    @GetMapping("/semesters/active")
    public ResponseEntity<?> getActiveSemester() {
        Semester active = semesterService.getActiveSemester();
        if (active != null) {
            return ResponseEntity.ok(active);
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Không có học kỳ nào đang kích hoạt!"));
    }

    @GetMapping("/semesters/{id}/weeks")
    public ResponseEntity<?> getSemesterWeeks(@PathVariable Long id) {
        List<SemesterWeek> weeks = semesterService.getSemesterWeeks(id);
        return ResponseEntity.ok(weeks);
    }
}
