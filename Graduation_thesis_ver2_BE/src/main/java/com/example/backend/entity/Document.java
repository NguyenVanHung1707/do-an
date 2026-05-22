package com.example.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "document")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Document {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_folder_id")
    private Document parentFolder;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "type", nullable = false)
    private String type; // 'FILE' hoặc 'FOLDER'

    @Column(name = "file_path", length = 1000)
    private String filePath;

    @Column(name = "file_extension")
    private String fileExtension;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "uploader_id", nullable = false)
    private String uploaderId;

    @Column(name = "uploader_name", nullable = false)
    private String uploaderName;

    @Column(name = "created_at")
    @CreationTimestamp
    private OffsetDateTime createdAt;
}
