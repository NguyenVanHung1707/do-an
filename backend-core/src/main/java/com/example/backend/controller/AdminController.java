package com.example.backend.controller;

import com.example.backend.entity.Teacher;
import com.example.backend.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AdminController {

    private final AdminService adminService;

    // Hàm tiện ích để xác thực role Admin trực tiếp từ Token JWT
    private boolean isAdmin(Jwt jwt) {
        if (jwt == null) return false;
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess != null && realmAccess.get("roles") instanceof List) {
            List<?> roles = (List<?>) realmAccess.get("roles");
            return roles.contains("admin");
        }
        return false;
    }

    @GetMapping("/teachers/pending")
    public ResponseEntity<?> getPendingTeachers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search,
            @AuthenticationPrincipal Jwt jwt) {
        
        if (!isAdmin(jwt)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Từ chối truy cập: Yêu cầu quyền ADMIN!"));
        }

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Teacher> pendingTeachers = adminService.getPendingTeachers(search, pageRequest);
        return ResponseEntity.ok(pendingTeachers);
    }

    @PutMapping("/teachers/{id}/approve")
    public ResponseEntity<?> approveTeacher(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {

        if (!isAdmin(jwt)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Từ chối truy cập: Yêu cầu quyền ADMIN!"));
        }

        try {
            adminService.approveTeacher(id);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Phê duyệt tài khoản giáo viên thành công!"
            ));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Không thể phê duyệt tài khoản: " + e.getMessage()));
        }
    }

    @PutMapping("/teachers/{id}/reject")
    public ResponseEntity<?> rejectTeacher(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal Jwt jwt) {

        if (!isAdmin(jwt)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Từ chối truy cập: Yêu cầu quyền ADMIN!"));
        }

        String reason = payload.getOrDefault("reason", "Hồ sơ đăng ký không đầy đủ hoặc không hợp lệ.");

        try {
            adminService.rejectTeacher(id, reason);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Từ chối tài khoản giáo viên thành công!"
            ));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Không thể từ chối tài khoản: " + e.getMessage()));
        }
    }

    @GetMapping("/metrics/traffic")
    public ResponseEntity<?> getTrafficMetrics(
            @RequestParam(defaultValue = "day") String period,
            @AuthenticationPrincipal Jwt jwt) {

        if (!isAdmin(jwt)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Từ chối truy cập: Yêu cầu quyền ADMIN!"));
        }

        return ResponseEntity.ok(adminService.getTrafficAnalytics(period));
    }

    @GetMapping("/metrics/performance")
    public ResponseEntity<?> getPerformanceMetrics(@AuthenticationPrincipal Jwt jwt) {
        if (!isAdmin(jwt)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Từ chối truy cập: Yêu cầu quyền ADMIN!"));
        }

        return ResponseEntity.ok(adminService.getSystemPerformance());
    }
}
