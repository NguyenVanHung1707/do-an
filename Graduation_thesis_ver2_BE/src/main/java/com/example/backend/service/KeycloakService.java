package com.example.backend.service;

import com.example.backend.dto.SignUpDto;
import com.example.backend.dto.SignUpResponseDto;
import org.springframework.stereotype.Service;

@Service
public interface KeycloakService {
    SignUpResponseDto signUpStudent(SignUpDto signUpDto);
    SignUpResponseDto signUpTeacher(SignUpDto signUpDto);
}
