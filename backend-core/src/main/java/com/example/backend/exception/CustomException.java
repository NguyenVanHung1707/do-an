package com.example.backend.exception;

import lombok.Getter;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.Map;

@Getter
public class CustomException extends ResponseStatusException {
    private String message;
    private Map<String, Object> details = Collections.emptyMap();

    public CustomException(String message, HttpStatusCode statusCode) {
        super(statusCode, message);
        this.message = message;
    }

    public CustomException(String message, HttpStatusCode statusCode, Map<String, Object> details) {
        super(statusCode, message);
        this.message = message;
        this.details = details != null ? details : Collections.emptyMap();
    }

    public CustomException(String message) {
        super(HttpStatusCode.valueOf(400), message);
        this.message = message;
    }

    public CustomException(HttpStatusCode statusCode) {
        super(statusCode);
    }
}
