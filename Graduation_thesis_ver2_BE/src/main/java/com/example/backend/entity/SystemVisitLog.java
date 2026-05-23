package com.example.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "system_visit_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemVisitLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "request_uri", length = 255)
    private String requestUri;

    @Column(name = "status_code")
    private Integer statusCode;

    @Column(name = "response_time_ms")
    private Long responseTimeMs;

    @Column(name = "timestamp")
    private Instant timestamp;
}
