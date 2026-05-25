package com.example.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "semester_week", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"semester_id", "week_number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SemesterWeek {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    @Column(name = "week_number", nullable = false)
    private Integer weekNumber;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "week_type", nullable = false)
    private String weekType; // e.g. 'STUDY', 'MIDTERM_EXAM', 'FINAL_EXAM', 'HOLIDAY'
}
