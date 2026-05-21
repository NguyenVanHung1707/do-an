package com.example.backend.service;

import com.example.backend.entity.Teacher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Map;

public interface AdminService {
    Page<Teacher> getPendingTeachers(String search, Pageable pageable);
    void approveTeacher(Long id);
    void rejectTeacher(Long id, String reason);
    Map<String, Object> getTrafficAnalytics(String period);
    Map<String, Object> getSystemPerformance();
}
