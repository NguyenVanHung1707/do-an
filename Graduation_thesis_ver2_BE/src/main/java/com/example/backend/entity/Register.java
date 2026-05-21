package com.example.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "register")
@AllArgsConstructor
@Getter
@NoArgsConstructor
@Setter
public class Register {
    @EmbeddedId
    private RegisterId id;

    @Column(name = "register_time")
    @CreationTimestamp
    private OffsetDateTime registerTime;

    @Column(name = "note")
    private String note;

    //tong so lan diem danh
    @Column(name = "number_of_attendance")
    private Integer numberOfAttendance;

    //tong so lan vang
    @Column(name = "number_of_absence")
    private Integer numberOfAbsence;
}
