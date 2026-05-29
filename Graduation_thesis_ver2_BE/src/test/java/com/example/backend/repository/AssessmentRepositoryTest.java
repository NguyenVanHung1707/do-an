package com.example.backend.repository;

import com.example.backend.entity.Assessment;
import com.example.backend.entity.Course;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class AssessmentRepositoryTest {

    @Autowired
    private AssessmentRepository assessmentRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Test
    void courseCanHaveMultipleMidtermAndFinalAssessments() {
        Course course = new Course();
        course.setCourseCode("TEST101");
        course.setSubject("Test course");
        course.setIsActive(true);
        Course savedCourse = courseRepository.save(course);

        assessmentRepository.save(createAssessment(savedCourse, "Midterm 1", "MID_TERM"));
        assessmentRepository.save(createAssessment(savedCourse, "Midterm 2", "MID_TERM"));
        assessmentRepository.save(createAssessment(savedCourse, "Final 1", "FINAL_EXAM"));
        assessmentRepository.save(createAssessment(savedCourse, "Final 2", "FINAL_EXAM"));

        List<Assessment> assessments = assessmentRepository.findByCourseId(savedCourse.getId());

        assertThat(assessments)
                .filteredOn(assessment -> "MID_TERM".equals(assessment.getType()))
                .hasSize(2)
                .extracting(Assessment::getTitle)
                .containsExactlyInAnyOrder("Midterm 1", "Midterm 2");
        assertThat(assessments)
                .filteredOn(assessment -> "FINAL_EXAM".equals(assessment.getType()))
                .hasSize(2)
                .extracting(Assessment::getTitle)
                .containsExactlyInAnyOrder("Final 1", "Final 2");
    }

    private Assessment createAssessment(Course course, String title, String type) {
        Assessment assessment = new Assessment();
        assessment.setCourse(course);
        assessment.setTitle(title);
        assessment.setType(type);
        assessment.setMaxScore(10.0);
        assessment.setDurationMinutes(60);
        assessment.setScoreReleaseMode("AUTOMATIC");
        assessment.setIsPublished(true);
        return assessment;
    }
}
