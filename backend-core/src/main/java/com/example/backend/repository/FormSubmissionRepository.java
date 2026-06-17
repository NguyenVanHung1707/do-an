package com.example.backend.repository;

import com.example.backend.entity.Form;
import com.example.backend.entity.FormSubmission;
import com.example.backend.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FormSubmissionRepository extends JpaRepository<FormSubmission, Long> {
    List<FormSubmission> findByForm(Form form);
    List<FormSubmission> findByFormAndIsCorrect(Form form, Boolean isCorrect);
    Optional<FormSubmission> findByStudentAndForm(Student student, Form form);
    
    @Query("select fs from FormSubmission fs where fs.form.course.id = ?1 and fs.form.lectureNumber = ?2 and fs.student.id = ?3 and fs.isCorrect = true")
    List<FormSubmission> findSuccessfulSubmissionsBySession(Long courseId, Integer lectureNumber, Long studentId);
}
