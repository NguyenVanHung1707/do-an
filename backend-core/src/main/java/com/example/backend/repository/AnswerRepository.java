package com.example.backend.repository;

import com.example.backend.entity.Answer;
import com.example.backend.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AnswerRepository extends JpaRepository<Answer, Long> {
    List<Answer> findByQuestion(Question question);
    Optional<Answer> findById(Long id);
}