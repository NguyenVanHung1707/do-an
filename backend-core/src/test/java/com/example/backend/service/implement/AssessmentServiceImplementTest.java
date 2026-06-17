package com.example.backend.service.implement;

import com.example.backend.dto.AssessmentDto;
import com.example.backend.entity.Course;
import com.example.backend.repository.AssessmentQuestionRepository;
import com.example.backend.repository.AssessmentRepository;
import com.example.backend.repository.CourseRepository;
import com.example.backend.repository.StudentAnswerRepository;
import com.example.backend.repository.StudentRepository;
import com.example.backend.repository.StudentSubmissionRepository;
import com.example.backend.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class AssessmentServiceImplementTest {

    @Autowired
    private AssessmentRepository assessmentRepository;

    @Autowired
    private AssessmentQuestionRepository questionRepository;

    @Autowired
    private StudentSubmissionRepository submissionRepository;

    @Autowired
    private StudentAnswerRepository studentAnswerRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private StudentRepository studentRepository;

    private AssessmentServiceImplement assessmentService;

    @BeforeEach
    void setUp() {
        assessmentService = new AssessmentServiceImplement(
                assessmentRepository,
                questionRepository,
                submissionRepository,
                studentAnswerRepository,
                courseRepository,
                studentRepository,
                new ObjectMapper(),
                mock(NotificationService.class));
    }

    @Test
    void createAssessmentAllowsMultipleMidtermAndFinalAssessmentsForSameCourse() {
        Course course = new Course();
        course.setCourseCode("TEST102");
        course.setSubject("Test service course");
        course.setIsActive(true);
        Course savedCourse = courseRepository.save(course);

        assessmentService.createAssessment(createAssessmentDto(savedCourse.getId(), "Midterm 1", "MID_TERM"), "teacher-id");
        assessmentService.createAssessment(createAssessmentDto(savedCourse.getId(), "Midterm 2", "MID_TERM"), "teacher-id");
        assessmentService.createAssessment(createAssessmentDto(savedCourse.getId(), "Final 1", "FINAL_EXAM"), "teacher-id");
        assessmentService.createAssessment(createAssessmentDto(savedCourse.getId(), "Final 2", "FINAL_EXAM"), "teacher-id");

        assertThat(assessmentRepository.findByCourseId(savedCourse.getId()))
                .filteredOn(assessment -> "MID_TERM".equals(assessment.getType()))
                .hasSize(2)
                .extracting("title")
                .containsExactlyInAnyOrder("Midterm 1", "Midterm 2");
        assertThat(assessmentRepository.findByCourseId(savedCourse.getId()))
                .filteredOn(assessment -> "FINAL_EXAM".equals(assessment.getType()))
                .hasSize(2)
                .extracting("title")
                .containsExactlyInAnyOrder("Final 1", "Final 2");
    }

    private AssessmentDto createAssessmentDto(Long courseId, String title, String type) {
        AssessmentDto dto = new AssessmentDto();
        dto.setCourseId(courseId);
        dto.setTitle(title);
        dto.setType(type);
        dto.setMaxScore(10.0);
        dto.setDurationMinutes(60);
        dto.setScoreReleaseMode("AUTOMATIC");
        dto.setIsPublished(true);
        return dto;
    }
}
