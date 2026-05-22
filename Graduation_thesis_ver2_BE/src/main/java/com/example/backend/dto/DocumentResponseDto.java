package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DocumentResponseDto {
    private Long id;
    private Long courseId;
    private Long parentFolderId;
    private String name;
    private String type; // 'FILE' hoặc 'FOLDER'
    private String filePath;
    private String fileExtension;
    private Long fileSize;
    private String uploaderId;
    private String uploaderName;
    private OffsetDateTime createdAt;
}
