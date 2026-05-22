package com.example.backend.service;

import com.example.backend.dto.DocumentResponseDto;
import com.example.backend.dto.StudentPermissionResponseDto;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface DocumentService {
    DocumentResponseDto uploadFile(Long courseId, Long parentFolderId, MultipartFile file, String sub, String uploaderName);

    Resource downloadFile(Long docId, String sub, String userRole);

    DocumentResponseDto createFolder(Long courseId, Long parentFolderId, String folderName, String sub, String creatorName);

    List<DocumentResponseDto> getDocuments(Long courseId, Long parentFolderId, String sub, String userRole);

    void deleteDocument(Long docId, String sub, String userRole);

    List<StudentPermissionResponseDto> getStudentPermissions(Long courseId, String sub, String userRole);

    void updateStudentPermissions(Long courseId, Long studentId, boolean canUpload, boolean canDownload, String sub);

    void updateClassPermissionsBulk(Long courseId, boolean canUpload, boolean canDownload, String sub);

    StudentPermissionResponseDto getMyPermission(Long courseId, String sub);
}
