package com.example.backend.service.implement;

import com.example.backend.config.KeycloakConfig;
import com.example.backend.entity.Teacher;
import com.example.backend.repository.TeacherRepository;
import com.example.backend.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.keycloak.OAuth2Constants;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.representations.idm.UserRepresentation;
import org.keycloak.representations.idm.RoleRepresentation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Slf4j
public class AdminServiceImplement implements AdminService {

    private final TeacherRepository teacherRepository;
    private final KeycloakConfig keycloakConfig;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private JavaMailSender mailSender;

    public AdminServiceImplement(TeacherRepository teacherRepository, KeycloakConfig keycloakConfig) {
        this.teacherRepository = teacherRepository;
        this.keycloakConfig = keycloakConfig;
    }

    private Keycloak getKeycloakClient() {
        return KeycloakBuilder.builder()
                .serverUrl(keycloakConfig.getServerUrl())
                .realm("master")
                .grantType(OAuth2Constants.PASSWORD)
                .clientId("admin-cli")
                .username(keycloakConfig.getAdminUsername())
                .password(keycloakConfig.getAdminPassword())
                .build();
    }

    @Override
    public Page<Teacher> getPendingTeachers(String search, Pageable pageable) {
        return teacherRepository.findPendingTeachers("PENDING", search, pageable);
    }

    @Override
    @Transactional
    public void approveTeacher(Long id) {
        Teacher teacher = teacherRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy giáo viên với ID: " + id));

        // 1. Cập nhật Keycloak: Gán role 'teacher' (nếu chưa có)
        try {
            Keycloak keycloak = getKeycloakClient();
            UserResource userResource = keycloak.realm(keycloakConfig.getRealm()).users().get(teacher.getKeycloakId());
            
            // Lấy thông tin user hiện tại
            UserRepresentation user = userResource.toRepresentation();
            
            // Lấy role 'teacher' từ realm
            RoleRepresentation teacherRole = keycloak.realm(keycloakConfig.getRealm()).roles().get("teacher").toRepresentation();
            
            // Gán role
            userResource.roles().realmLevel().add(List.of(teacherRole));
            
            log.info("Đã phê duyệt tài khoản và gán quyền teacher trên Keycloak cho email: {}", teacher.getEmail());
        } catch (Exception e) {
            log.error("Lỗi đồng bộ Keycloak Admin API khi approve: ", e);
            throw new RuntimeException("Lỗi kết nối máy chủ xác thực Keycloak!");
        }

        // 2. Cập nhật PostgreSQL
        teacher.setAccountStatus("ACTIVE");
        teacher.setIsActive(true);
        teacherRepository.save(teacher);

        // 3. Gửi Email thông báo thành công
        sendEmail(teacher.getEmail(), 
                "Tài khoản Giáo viên của bạn đã được phê duyệt!",
                "Chào " + teacher.getName() + ",\n\nTài khoản giáo viên của bạn trên hệ thống Thư Viện Số đã được phê duyệt thành công. Bạn hiện có thể đăng nhập và sử dụng toàn bộ chức năng dành cho giáo viên.\n\nTrân trọng,\nĐội ngũ quản trị.");
    }

    @Override
    @Transactional
    public void rejectTeacher(Long id, String reason) {
        Teacher teacher = teacherRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy giáo viên với ID: " + id));

        // 1. Cập nhật PostgreSQL
        teacher.setAccountStatus("REJECTED");
        teacher.setIsActive(false);
        teacher.setRejectionReason(reason);
        teacherRepository.save(teacher);

        // 2. Gửi Email từ chối kèm lý do
        sendEmail(teacher.getEmail(), 
                "Thông báo kết quả duyệt tài khoản Giáo viên",
                "Chào " + teacher.getName() + ",\n\nRất tiếc, tài khoản giáo viên của bạn không đủ điều kiện phê duyệt tại thời điểm này.\nLý do từ chối: " + reason + "\n\nVui lòng liên hệ với ban quản trị hoặc đăng ký lại với hồ sơ đầy đủ hơn.\n\nTrân trọng,\nĐội ngũ quản trị.");
    }

    private void sendEmail(String to, String subject, String body) {
        try {
            if (mailSender == null) {
                log.warn("JavaMailSender is not configured (SMTP settings missing). Skipping email notification to: {}", to);
                return;
            }
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Đã gửi email thông báo thành công tới: {}", to);
        } catch (Exception e) {
            log.error("Không thể gửi email thông báo (vui lòng kiểm tra SMTP): ", e);
        }
    }

    @Override
    public Map<String, Object> getTrafficAnalytics(String period) {
        // Dữ liệu thống kê truy cập giả lập chất lượng cao
        List<Map<String, Object>> chartData = new ArrayList<>();
        int totalVisitors = 0;
        int totalRequests = 0;

        if ("day".equalsIgnoreCase(period)) {
            chartData.add(Map.of("label", "00:00", "value", 20));
            chartData.add(Map.of("label", "04:00", "value", 10));
            chartData.add(Map.of("label", "08:00", "value", 150));
            chartData.add(Map.of("label", "12:00", "value", 380));
            chartData.add(Map.of("label", "16:00", "value", 290));
            chartData.add(Map.of("label", "20:00", "value", 420));
            totalVisitors = 1270;
            totalRequests = 5480;
        } else if ("week".equalsIgnoreCase(period)) {
            chartData.add(Map.of("label", "Thứ 2", "value", 850));
            chartData.add(Map.of("label", "Thứ 3", "value", 920));
            chartData.add(Map.of("label", "Thứ 4", "value", 1050));
            chartData.add(Map.of("label", "Thứ 5", "value", 1120));
            chartData.add(Map.of("label", "Thứ 6", "value", 980));
            chartData.add(Map.of("label", "Thứ 7", "value", 450));
            chartData.add(Map.of("label", "Chủ Nhật", "value", 380));
            totalVisitors = 5750;
            totalRequests = 24600;
        } else { // Month
            chartData.add(Map.of("label", "Tuần 1", "value", 3400));
            chartData.add(Map.of("label", "Tuần 2", "value", 4100));
            chartData.add(Map.of("label", "Tuần 3", "value", 3900));
            chartData.add(Map.of("label", "Tuần 4", "value", 4800));
            totalVisitors = 16200;
            totalRequests = 71200;
        }

        return Map.of(
            "period", period,
            "totalVisitors", totalVisitors,
            "totalRequests", totalRequests,
            "chart", chartData
        );
    }

    @Override
    public Map<String, Object> getSystemPerformance() {
        // Thu thập hiệu năng JVM
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        double ramUsagePercent = ((double) usedMemory / totalMemory) * 100;

        return Map.of(
            "activeUsersOnline", 3, // Giả lập người dùng online thực tế
            "averageResponseTimeMs", 28,
            "errorRatePercent", 0.45,
            "cpuUsagePercent", 4.8,
            "ramUsagePercent", Math.round(ramUsagePercent * 100.0) / 100.0,
            "containerStatus", List.of(
                Map.of("name", "spring-boot-backend", "status", "UP", "cpu", "2.1%", "ram", "312MB"),
                Map.of("name", "nginx-vps", "status", "UP", "cpu", "0.2%", "ram", "12MB"),
                Map.of("name", "keycloak-auth", "status", "UP", "cpu", "0.9%", "ram", "480MB"),
                Map.of("name", "fastapi-faceid", "status", "UP", "cpu", "0.0%", "ram", "148MB"),
                Map.of("name", "postgresql-db", "status", "UP", "cpu", "0.4%", "ram", "85MB")
            )
        );
    }
}
