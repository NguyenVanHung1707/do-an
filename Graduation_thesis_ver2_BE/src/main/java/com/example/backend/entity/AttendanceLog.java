package com.example.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "attendance_log")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AttendanceLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private Student student;

    @ManyToOne
    @JoinColumn(name = "course_id")
    private Course course;

    @Column(name = "attendance_time")
    private OffsetDateTime attendanceTime;

    @Column(name = "lecture_number")
    private Integer lectureNumber;

    @Column(name = "is_attendance")
    private Boolean isAttendance;
}
