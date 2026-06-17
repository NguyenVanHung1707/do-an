package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StudentPermissionResponseDto {
    private Long studentId;
    private String studentCode;
    private String studentName;
    private String email;
    private Boolean canUploadDocuments;
    private Boolean canDownloadDocuments;
}
