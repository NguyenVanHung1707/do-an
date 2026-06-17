package com.example.backend.controller;

import jakarta.annotation.security.PermitAll;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/proctor")
@CrossOrigin(origins = "*")
public class AIProctorController {

    @Value("${app.ai.proctor.url:http://ai_proctor:8000}")
    private String aiProctorBaseUrl;

    @Value("${app.proctor.storage.dir:${APP_PROCTOR_STORAGE_DIR:./data/future_ai_feature}}")
    private String proctorStorageDir;

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
            Map<String, Object> body = response.getBody();
            if (body != null && body.containsKey("logs")) {
                Object logsObj = body.get("logs");
                if (logsObj instanceof java.util.List) {
                    java.util.List<Map<String, Object>> logs = (java.util.List<Map<String, Object>>) logsObj;
                    for (Map<String, Object> log : logs) {
                        String videoPath = (String) log.get("video_path");
                        if (videoPath != null) {
                            String filename = videoPath.substring(videoPath.lastIndexOf(java.io.File.separator) + 1);
                            if (filename.contains("/")) {
                                filename = filename.substring(filename.lastIndexOf("/") + 1);
                            }
                            if (filename.contains("\\")) {
                                filename = filename.substring(filename.lastIndexOf("\\") + 1);
                            }
                            String videoUrl = "/api/proctor/video?examId=" + examId + "&studentId=" + studentId + "&filename=" + filename;
                            log.put("videoUrl", videoUrl);
                        }
                    }
                }
            }
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Lỗi khi tải nhật ký vi phạm từ AI Giám Thị: " + e.getMessage());
        }
    }

    @PermitAll
    @GetMapping("/video")
    public ResponseEntity<Resource> getViolationVideo(
            @RequestParam String examId,
            @RequestParam String studentId,
            @RequestParam String filename) {
        try {
            java.nio.file.Path filePath = java.nio.file.Paths.get(proctorStorageDir)
                    .resolve(examId)
                    .resolve(studentId)
                    .resolve(filename)
                    .normalize();
            
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType("video/mp4"))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
