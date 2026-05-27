package com.example.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CustomException.class)
    public ResponseEntity<Map<String, Object>> handleCustomException(CustomException ex) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", ex.getMessage());
        body.put("timestamp", OffsetDateTime.now().toString());

        return new ResponseEntity<>(body, status);
    }

    @ExceptionHandler(ScheduleConflictException.class)
    public ResponseEntity<Map<String, Object>> handleScheduleConflictException(ScheduleConflictException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", HttpStatus.CONFLICT.value());
        body.put("error", "Schedule Conflict Detected");
        body.put("message", ex.getMessage());
        body.put("timestamp", OffsetDateTime.now().toString());
        body.put("conflicts", ex.getConflicts());
        body.putAll(ex.getDetails());

        return new ResponseEntity<>(body, HttpStatus.CONFLICT);
    }
}
