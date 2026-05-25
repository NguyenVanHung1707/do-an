package com.example.backend.service;

import com.example.backend.entity.*;
import com.example.backend.repository.*;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final StudentRepository studentRepository;
    private final RegisterRepository registerRepository;
    private final AttendanceLogRepository attendanceLogRepository;
    private final StudentSubmissionRepository studentSubmissionRepository;
    private final CourseRepository courseRepository;
    private final AssessmentRepository assessmentRepository;

    public AnalyticsService(StudentRepository studentRepository,
                            RegisterRepository registerRepository,
                            AttendanceLogRepository attendanceLogRepository,
                            StudentSubmissionRepository studentSubmissionRepository,
                            CourseRepository courseRepository,
                            AssessmentRepository assessmentRepository) {
        this.studentRepository = studentRepository;
        this.registerRepository = registerRepository;
        this.attendanceLogRepository = attendanceLogRepository;
        this.studentSubmissionRepository = studentSubmissionRepository;
        this.courseRepository = courseRepository;
        this.assessmentRepository = assessmentRepository;
    }

    public Map<String, Object> getStudentSummary(String keycloakId, Long semesterId) {
        Map<String, Object> summary = new HashMap<>();

        Optional<Student> studentOpt = studentRepository.findByKeycloakId(keycloakId);
        if (studentOpt.isEmpty()) {
            throw new RuntimeException("Student not found for keycloak ID: " + keycloakId);
        }
        Student student = studentOpt.get();

        // 1. Fetch registered courses
        List<Register> registrations = registerRepository.findByIdStudent(student);

        if (semesterId != null) {
            registrations = registrations.stream()
                .filter(reg -> reg.getId().getCourse() != null && 
                               reg.getId().getCourse().getSemester() != null && 
                               reg.getId().getCourse().getSemester().getId().equals(semesterId))
                .collect(Collectors.toList());
        }

        int totalCourses = registrations.size();
        summary.put("totalCourses", totalCourses);

        if (totalCourses == 0) {
            summary.put("averageAttendance", 100);
            summary.put("totalAbsences", 0);
            summary.put("gpaProgress", new ArrayList<>());
            summary.put("absencesBreakdown", new ArrayList<>());
            return summary;
        }

        List<Map<String, Object>> gpaProgress = new ArrayList<>();
        int totalAbsences = 0;
        int totalSessions = 0;
        int totalPresences = 0;
        List<AttendanceLog> allLogs = new ArrayList<>();

        for (Register reg : registrations) {
            Course course = reg.getId().getCourse();
            if (course == null) continue;

            // Fetch attendance logs for this student in this course
            List<AttendanceLog> logs = attendanceLogRepository.findByStudentAndCourse(student, course);

            allLogs.addAll(logs);

            int courseSessions = logs.size();
            int coursePresences = (int) logs.stream().filter(AttendanceLog::getIsAttendance).count();
            int courseAbsences = courseSessions - coursePresences;

            totalSessions += courseSessions;
            totalPresences += coursePresences;
            totalAbsences += courseAbsences;

            int attendanceRate = courseSessions > 0 ? (int) Math.round(((double) coursePresences / courseSessions) * 100) : 100;

            // Fetch assessments and submissions to calculate average grade for this course
            List<Assessment> assessments = assessmentRepository.findByCourseId(course.getId());
            double totalWeight = 0;
            double weightedScore = 0;

            for (Assessment ass : assessments) {
                Optional<StudentSubmission> subOpt = studentSubmissionRepository.findByAssessmentIdAndStudentId(ass.getId(), keycloakId);
                if (subOpt.isPresent() && "GRADED".equals(subOpt.get().getStatus())) {
                    Double score = subOpt.get().getFinalScore();
                    if (score != null) {
                        weightedScore += (score / ass.getMaxScore()) * 10.0; // scale to 10
                        totalWeight += 1.0;
                    }
                }
            }

            double averageGrade = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 10.0) / 10.0 : 0.0;

            Map<String, Object> courseStat = new HashMap<>();
            courseStat.put("courseCode", course.getCourseCode());
            courseStat.put("subject", course.getSubject());
            courseStat.put("attendanceRate", attendanceRate);
            courseStat.put("averageGrade", averageGrade);
            gpaProgress.add(courseStat);
        }

        int avgAttendance = totalSessions > 0 ? (int) Math.round(((double) totalPresences / totalSessions) * 100) : 100;
        summary.put("averageAttendance", avgAttendance);
        summary.put("totalAbsences", totalAbsences);
        summary.put("gpaProgress", gpaProgress);

        // Calculate monthly absences breakdown
        Map<String, Integer> monthlyAbs = new LinkedHashMap<>();
        // Initialize last 3 months
        OffsetDateTime now = OffsetDateTime.now();
        for (int i = 2; i >= 0; i--) {
            OffsetDateTime targetMonth = now.minusMonths(i);
            String monthLabel = "Tháng " + targetMonth.getMonthValue();
            monthlyAbs.put(monthLabel, 0);
        }

        for (AttendanceLog log : allLogs) {
            if (!log.getIsAttendance() && log.getAttendanceTime() != null) {
                OffsetDateTime time = log.getAttendanceTime();
                String monthLabel = "Tháng " + time.getMonthValue();
                if (monthlyAbs.containsKey(monthLabel)) {
                    monthlyAbs.put(monthLabel, monthlyAbs.get(monthLabel) + 1);
                }
            }
        }

        List<Map<String, Object>> absencesBreakdown = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : monthlyAbs.entrySet()) {
            Map<String, Object> item = new HashMap<>();
            item.put("month", entry.getKey());
            item.put("absences", entry.getValue());
            absencesBreakdown.add(item);
        }

        summary.put("absencesBreakdown", absencesBreakdown);
        return summary;
    }

    public Map<String, Object> getTeacherClassSummary(Long courseId) {
        Map<String, Object> summary = new HashMap<>();

        Optional<Course> courseOpt = courseRepository.findById(courseId);
        if (courseOpt.isEmpty()) {
            throw new RuntimeException("Course not found for ID: " + courseId);
        }
        Course course = courseOpt.get();

        // Fetch registered students in this course
        List<Register> registrations = registerRepository.findByIdCourse(course);
        int totalStudents = registrations.size();
        summary.put("totalStudents", totalStudents);

        if (totalStudents == 0) {
            summary.put("averageAttendance", 100);
            summary.put("gradeDistribution", Map.of("0-4", 0, "4-6", 0, "6-8", 0, "8-10", 0));
            summary.put("studentStats", new ArrayList<>());
            return summary;
        }

        List<Map<String, Object>> studentStats = new ArrayList<>();
        int totalCourseSessions = 0;
        int totalCoursePresences = 0;

        int weakCount = 0; // 0-4
        int averageCount = 0; // 4-6
        int goodCount = 0; // 6-8
        int excellentCount = 0; // 8-10

        // Fetch assessments for the course to calculate grade distributions
        List<Assessment> assessments = assessmentRepository.findByCourseId(courseId);

        for (Register reg : registrations) {
            Student student = reg.getId().getStudent();
            if (student == null) continue;
            String keycloakId = student.getKeycloakId();

            // Fetch attendance logs for this student in this course
            List<AttendanceLog> logs = attendanceLogRepository.findByStudentAndCourse(student, course);

            int courseSessions = logs.size();
            int coursePresences = (int) logs.stream().filter(AttendanceLog::getIsAttendance).count();
            int attendanceRate = courseSessions > 0 ? (int) Math.round(((double) coursePresences / courseSessions) * 100) : 100;

            totalCourseSessions += courseSessions;
            totalCoursePresences += coursePresences;

            // Fetch graded submissions for this student
            double totalWeight = 0;
            double weightedScore = 0;

            for (Assessment ass : assessments) {
                Optional<StudentSubmission> subOpt = studentSubmissionRepository.findByAssessmentIdAndStudentId(ass.getId(), keycloakId);
                if (subOpt.isPresent() && "GRADED".equals(subOpt.get().getStatus())) {
                    Double score = subOpt.get().getFinalScore();
                    if (score != null) {
                        weightedScore += (score / ass.getMaxScore()) * 10.0;
                        totalWeight += 1.0;
                    }
                }
            }

            double averageGrade = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 10.0) / 10.0 : 0.0;

            // Categorize average grade for distribution
            if (averageGrade < 4.0) weakCount++;
            else if (averageGrade < 6.0) averageCount++;
            else if (averageGrade < 8.0) goodCount++;
            else excellentCount++;

            Map<String, Object> stat = new HashMap<>();
            stat.put("studentCode", student.getStudentCode());
            stat.put("name", student.getName());
            stat.put("attendanceRate", attendanceRate);
            stat.put("averageGrade", averageGrade);
            studentStats.add(stat);
        }

        int avgAttendance = totalCourseSessions > 0 ? (int) Math.round(((double) totalCoursePresences / totalCourseSessions) * 100) : 100;
        summary.put("averageAttendance", avgAttendance);

        Map<String, Integer> dist = new HashMap<>();
        dist.put("weak", weakCount);
        dist.put("average", averageCount);
        dist.put("good", goodCount);
        dist.put("excellent", excellentCount);
        summary.put("gradeDistribution", dist);

        summary.put("studentStats", studentStats);
        return summary;
    }
}
