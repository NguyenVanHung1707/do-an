package com.example.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "student_answer")
@NoArgsConstructor
@AllArgsConstructor
public class StudentAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "submission_id", nullable = false)
    private StudentSubmission submission;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "question_id", nullable = false)
    private AssessmentQuestion question;

    @Column(name = "answer_text", columnDefinition = "text")
    private String answerText; // For Short Answer & Essay

    @Column(name = "selected_choice")
    private String selectedChoice; // For Multiple Choice

    @Column(name = "score")
    private Double score;

    @Column(name = "is_correct")
    private Boolean isCorrect;

    @Column(name = "teacher_comment", columnDefinition = "text")
    private String teacherComment;
}
