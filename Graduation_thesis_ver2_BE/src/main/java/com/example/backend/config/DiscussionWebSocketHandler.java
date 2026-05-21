package com.example.backend.config;

import com.example.backend.entity.Course;
import com.example.backend.entity.RegisterId;
import com.example.backend.entity.Student;
import com.example.backend.entity.Teacher;
import com.example.backend.repository.CourseRepository;
import com.example.backend.repository.RegisterRepository;
import com.example.backend.repository.StudentRepository;
import com.example.backend.repository.TeacherRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Map;
import java.util.Optional;

@Component
public class DiscussionWebSocketHandler extends TextWebSocketHandler {
    private final JwtDecoder jwtDecoder;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final RegisterRepository registerRepository;
    private final WebSocketSessionManager webSocketSessionManager;

    public DiscussionWebSocketHandler(
            JwtDecoder jwtDecoder,
            CourseRepository courseRepository,
            StudentRepository studentRepository,
            TeacherRepository teacherRepository,
            RegisterRepository registerRepository,
            WebSocketSessionManager webSocketSessionManager) {
        this.jwtDecoder = jwtDecoder;
        this.courseRepository = courseRepository;
        this.studentRepository = studentRepository;
        this.teacherRepository = teacherRepository;
        this.registerRepository = registerRepository;
        this.webSocketSessionManager = webSocketSessionManager;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        URI uri = session.getUri();
        if (uri == null) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        // Phân tích tham số truy vấn từ URI
        Map<String, String> queryParams = UriComponentsBuilder.fromUri(uri)
                .build()
                .getQueryParams()
                .toSingleValueMap();

        String courseIdStr = queryParams.get("courseId");
        String token = queryParams.get("token");

        if (courseIdStr == null || token == null) {
            session.close(new CloseStatus(4001, "Missing courseId or token"));
            return;
        }

        Long courseId;
        try {
            courseId = Long.parseLong(courseIdStr);
        } catch (NumberFormatException e) {
            session.close(new CloseStatus(4002, "Invalid courseId format"));
            return;
        }

        // 1. Xác thực Token JWT thông qua Keycloak JwtDecoder
        String keycloakId;
        try {
            Jwt jwt = jwtDecoder.decode(token);
            keycloakId = jwt.getClaimAsString("sub");
        } catch (Exception e) {
            session.close(new CloseStatus(4003, "Invalid or expired JWT token"));
            return;
        }

        // 2. Kiểm tra quyền truy cập lớp học
        Optional<Course> courseOpt = courseRepository.findById(courseId);
        if (courseOpt.isEmpty()) {
            session.close(new CloseStatus(4004, "Course not found"));
            return;
        }
        Course course = courseOpt.get();

        boolean authorized = false;

        // Kiểm tra xem có phải Giáo viên của lớp không
        Optional<Teacher> teacherOpt = teacherRepository.findByKeycloakId(keycloakId);
        if (teacherOpt.isPresent()) {
            authorized = course.getTeacher() != null && course.getTeacher().getId().equals(teacherOpt.get().getId());
        } else {
            // Kiểm tra xem có phải Sinh viên đăng ký lớp không
            Optional<Student> studentOpt = studentRepository.findByKeycloakId(keycloakId);
            if (studentOpt.isPresent()) {
                RegisterId registerId = new RegisterId();
                registerId.setStudent(studentOpt.get());
                registerId.setCourse(course);
                authorized = registerRepository.findById(registerId).isPresent();
            }
        }

        if (!authorized) {
            session.close(CloseStatus.POLICY_VIOLATION); // 403 Forbidden
            return;
        }

        // Lưu thông tin hợp lệ và đưa vào session manager
        session.getAttributes().put("courseId", courseId);
        session.getAttributes().put("keycloakId", keycloakId);
        webSocketSessionManager.addSession(courseId, session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        Long courseId = (Long) session.getAttributes().get("courseId");
        if (courseId != null) {
            webSocketSessionManager.removeSession(courseId, session);
        } else {
            webSocketSessionManager.removeSessionGlobal(session);
        }
    }
}
