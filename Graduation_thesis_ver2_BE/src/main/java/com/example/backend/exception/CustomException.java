package com.example.backend.exception;

import lombok.Getter;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.server.ResponseStatusException;

@Getter
public class CustomException extends ResponseStatusException {
    private String message;
    public CustomException(String message, HttpStatusCode statusCode) {
        super(statusCode);
        this.message = message;
    }
    public CustomException(String message) {
        super(HttpStatusCode.valueOf(400));
        this.message = message;
    }
    public CustomException(HttpStatusCode statusCode) {
        super(statusCode);
    }
}
