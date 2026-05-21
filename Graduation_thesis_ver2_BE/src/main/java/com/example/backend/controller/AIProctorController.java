package com.example.backend.controller;

import jakarta.annotation.security.PermitAll;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/proctor")
@CrossOrigin(origins = "*")
public class AIProctorController {

    @Value("${app.ai.proctor.url:http://ai_proctor:8000}")
    private String aiProctorBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @PermitAll
    @PostMapping("/start")
    public ResponseEntity<?> startExamProctoring(@RequestParam String examId, @RequestParam String studentId) {
        String url = aiProctorBaseUrl + "/api/proctor/start";
        
        Map<String, String> request = new HashMap<>();
        request.put("student_id", studentId);
        request.put("exam_id", examId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Không thể kết nối đến máy chủ AI Giám Thị: " + e.getMessage());
        }
    }

    @PermitAll
    @PostMapping("/stop")
    public ResponseEntity<?> stopExamProctoring(@RequestParam String examId, @RequestParam String studentId) {
        String url = aiProctorBaseUrl + "/api/proctor/stop";

        Map<String, String> request = new HashMap<>();
        request.put("student_id", studentId);
        request.put("exam_id", examId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Không thể kết nối đến máy chủ AI Giám Thị: " + e.getMessage());
        }
    }

    @PermitAll
    @GetMapping("/violations")
    public ResponseEntity<?> getViolations(@RequestParam String examId, @RequestParam String studentId) {
        String url = aiProctorBaseUrl + "/api/proctor/logs?exam_id=" + examId + "&student_id=" + studentId;
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Lỗi khi tải nhật ký vi phạm từ AI Giám Thị: " + e.getMessage());
        }
    }
}
