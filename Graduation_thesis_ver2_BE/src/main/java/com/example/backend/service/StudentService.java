package com.example.backend.service;

import com.example.backend.dto.AttendanceLogDto;
import com.example.backend.dto.FormDto;
import com.example.backend.dto.StudentAnswerDto;
import com.example.backend.dto.StudentDto;
import com.example.backend.entity.AttendanceLog;
import com.example.backend.entity.Student;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;


public interface StudentService {
    Student createStudent(StudentDto student);
    Student getStudentById(Long id);
    Student updateStudent(Long id, StudentDto student);
    void deleteStudent(Long id);
    Page<Student> getAllStudents(int page, int size);

    FormDto getFormByCode(String code, String sub);

    List<AttendanceLogDto> getMyAttendance(String sub);

    List<?> getMyCourse(String sub);

    List<?> getMyAttendanceInACourse(Long courseId, String sub);

    AttendanceLog submitAnswer(StudentAnswerDto studentAnswerDto, String sub);

    void uploadMyImage(MultipartFile file, String sub);

    Object getMyImage(String sub);
}
